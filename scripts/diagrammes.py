"""Générer et vérifier les diagrammes du site depuis _data/diagrammes.json.

Installation locale : py -m pip install -r scripts/requirements-diagrammes.txt --target tmp/chess-tools-normal
Vérification : py scripts/diagrammes.py --check ; génération : py scripts/diagrammes.py --write
"""
import argparse, html, json, math, pathlib, re, sys, xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/chess-tools-normal'))
import chess

NS = {'s': 'http://www.w3.org/2000/svg'}
DIRECTORY = ROOT / 'blog/images/diagrammes'
LIGHT, DARK = '#F0D9B5', '#B58863'

def read_svg(path):
    tree = ET.parse(path).getroot()
    texts = tree.findall('.//s:text', NS)
    files = {round((float(t.attrib['x'])-20)/40): ord(t.text)-97 for t in texts if t.text in list('abcdefgh') and float(t.attrib.get('y',0)) == 340}
    ranks = {round((float(t.attrib['y'])-25)/40): int(t.text)-1 for t in texts if t.text in list('12345678') and float(t.attrib.get('x',0)) == -10}
    assert set(files) == set(range(8)) and set(ranks) == set(range(8)), 'Coordonnées incomplètes'
    def square(x, y):
        return chess.square(files[int(float(x)//40)], ranks[int(float(y)//40)])
    pieces = {}
    for p in tree.findall('.//s:use', NS):
        name = p.attrib.get('href', p.attrib.get('{http://www.w3.org/1999/xlink}href','')).lstrip('#')
        assert re.fullmatch('[wb][KQRBNP]', name), 'Pièce non reconnue'
        sq = square(p.attrib.get('x',0), p.attrib.get('y',0))
        assert sq not in pieces, 'Deux pièces sur une case'
        pieces[sq] = chess.Piece.from_symbol(name[1] if name[0]=='w' else name[1].lower())
    highlights = {square(p.attrib.get('x',0),p.attrib.get('y',0)) for p in tree.findall('s:rect',NS) if p.attrib.get('width')=='40' and p.attrib.get('height')=='40'}
    arrows = [(square(p.attrib['x1'],p.attrib['y1']), square(p.attrib['x2'],p.attrib['y2'])) for p in tree.findall('s:line',NS)]
    pattern = tree.find('.//s:pattern[@id="cases"]',NS)
    assert pattern is not None
    for row in range(8):
        for col in range(8):
            x,y = (col*40+20)%80,(row*40+20)%80
            color = None
            for rect in pattern:
                rx,ry = float(rect.attrib.get('x',0)),float(rect.attrib.get('y',0))
                if rx<=x<rx+float(rect.attrib['width']) and ry<=y<ry+float(rect.attrib['height']): color=rect.attrib['fill']
            assert color == (LIGHT if (files[col]+ranks[row]+1)%2==0 else DARK), 'Couleur de case incorrecte'
    return pieces, highlights, arrows, files[0]==0

def board_for(record):
    board=chess.Board(record['fen'])
    if 'moves' in record:
        replay=chess.Board(record.get('startFen',chess.STARTING_FEN))
        for move in record['moves'].split(): replay.push_san(move)
        assert replay.fen(en_passant='fen')==board.fen(en_passant='fen'), 'La suite ne correspond pas à la FEN'
    if record.get('kind','position')=='position': assert board.is_valid(), 'Position non valide : '+str(board.status())
    for check in record.get('checks',[]):
        kind=check['type']
        if kind=='attacks':
            attacks=board.attacks(chess.parse_square(check['from']))
            assert all(chess.parse_square(s) in attacks for s in check['targets']), 'Attaque absente'
        elif kind=='pinned': assert board.is_pinned(board.color_at(chess.parse_square(check['square'])),chess.parse_square(check['square'])), 'Clouage absent'
        elif kind=='checkmate': assert board.is_checkmate(), 'Ce n’est pas un mat'
        elif kind=='stalemate': assert board.is_stalemate(), 'Ce n’est pas un pat'
        elif kind=='check': assert board.is_check(), 'Ce n’est pas un échec'
        elif kind=='illegal': assert chess.Move.from_uci(check['move']) not in board.legal_moves, 'Coup annoncé interdit mais légal'
        elif kind=='line':
            after=board.copy()
            for move in check['moves'].split(): after.push_san(move)
            if check.get('mate'): assert after.is_checkmate(), 'La solution ne donne pas mat'
            if check.get('check'): assert after.is_check(), 'La solution ne donne pas échec'
            if 'piece' in check:
                sq,piece=check['piece'].split(':'); assert after.piece_at(chess.parse_square(sq))==chess.Piece.from_symbol(piece)
        elif kind=='destinations':
            source=chess.parse_square(check['from'])
            assert set(board.attacks(source))=={chess.parse_square(s) for s in check['squares']}, 'Cases de déplacement incorrectes'
        elif kind=='miniGame':
            # Mini-jeu annoncé sans rois : les pions noirs restent immobiles.
            after=board.copy();source=chess.parse_square(check['from']);captures=0
            for target in check['route']:
                target=chess.parse_square(target)
                assert target in after.attacks(source), 'Trajet de tour impossible'
                captures+=after.piece_at(target) is not None
                after.remove_piece_at(target);after.set_piece_at(target,after.remove_piece_at(source));source=target
            assert captures==4 and len(after.piece_map())==1 and len(check['route'])==5, 'Le parcours ne capture pas les quatre pions en cinq coups'
        else: raise AssertionError('Contrôle inconnu : '+kind)
    return board

def render(record,board):
    # Réutilise les symboles vectoriels déjà présents sur le site.
    original=(DIRECTORY/'position-depart.svg').read_text(encoding='utf-8')
    defs=re.search(r'<defs>([\s\S]*?)</defs>',original)[1]
    defs=re.sub(r'<pattern\b[\s\S]*?</pattern>','<pattern id="cases" width="80" height="80" patternUnits="userSpaceOnUse"><rect width="80" height="80" fill="'+DARK+'"/><rect width="40" height="40" fill="'+LIGHT+'"/><rect x="40" y="40" width="40" height="40" fill="'+LIGHT+'"/></pattern>',defs,count=1)
    white=record.get('orientation','white')=='white'
    def xy(square):
        f,r=chess.square_file(square),chess.square_rank(square)
        return (f*40,(7-r)*40) if white else ((7-f)*40,r*40)
    lines=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -10 360 350" width="360" height="350" role="img" aria-labelledby="diagram-title" data-fen="'+html.escape(record['fen'],quote=True)+'">', '<title id="diagram-title">'+html.escape(record['title'])+'</title>','<defs>'+defs+'</defs>','<rect x="0" y="0" width="320" height="320" fill="url(#cases)" stroke="#1a1a1a" stroke-width="2"/>']
    for square in record.get('highlights',[]):
        x,y=xy(chess.parse_square(square));lines.append(f'<rect x="{x}" y="{y}" width="40" height="40" fill="#FFD54F" opacity="0.5"/>')
    for square,piece in sorted(board.piece_map().items()):
        x,y=xy(square);name=('w' if piece.color else 'b')+piece.symbol().upper();lines.append(f'<use href="#{name}" x="{x}" y="{y}" width="40" height="40"/>')
    for origin,target in record.get('arrows',[]):
        x,y=xy(chess.parse_square(origin));u,v=xy(chess.parse_square(target));x+=20;y+=20;u+=20;v+=20
        distance=math.hypot(u-x,v-y);u-=12*(u-x)/distance;v-=12*(v-y)/distance
        lines.append(f'<line x1="{x}" y1="{y}" x2="{u}" y2="{v}" stroke="#B05E17" stroke-width="5" stroke-linecap="round" marker-end="url(#pointe)" opacity="0.9"/>')
    lines.append('<g font-family="Georgia,serif" font-size="13" fill="#5a4632" text-anchor="middle">')
    for col in range(8):lines.append(f'<text x="{col*40+20}" y="340">{chr(97+(col if white else 7-col))}</text>')
    for row in range(8):lines.append(f'<text x="-10" y="{row*40+25}">{8-row if white else row+1}</text>')
    return '\n'.join(lines+['</g>','</svg>'])+'\n'

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--write',action='store_true');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    records=json.loads((ROOT/'_data/diagrammes.json').read_text(encoding='utf-8'))
    assert len({r['file'] for r in records})==len(records), 'Fichier dupliqué'
    for record in records:
        try:
            board=board_for(record)
            if args.write and record.get('generated'): (DIRECTORY/record['file']).write_text(render(record,board),encoding='utf-8',newline='\n')
            pieces,marks,arrows,white=read_svg(DIRECTORY/record['file'])
            assert pieces==board.piece_map(), 'Pièces différentes de la position validée'
            assert white==(record.get('orientation','white')=='white'), 'Orientation incorrecte'
            if 'highlights' in record: assert marks=={chess.parse_square(s) for s in record['highlights']}, 'Surlignages incorrects'
            if 'arrows' in record: assert arrows==[(chess.parse_square(a),chess.parse_square(b)) for a,b in record['arrows']], 'Flèches incorrectes'
        except Exception as error: raise AssertionError(record['file']+' : '+str(error)) from error
    actual={p.name for p in DIRECTORY.glob('*.svg')}
    assert actual=={r['file'] for r in records}, 'Diagramme non répertorié'
    print(f'{len(records)} diagrammes vérifiés : pièces, coordonnées, 64 couleurs, orientation et contrôles échiquéens.')

if __name__=='__main__':main()
