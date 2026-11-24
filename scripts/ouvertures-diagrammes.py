"""Produire les diagrammes des contenus d'ouverture, puis les auditer globalement.

py scripts/ouvertures-diagrammes.py --write
py scripts/diagrammes.py --check
"""
import argparse
import json
from pathlib import Path
import diagrammes

ROOT = Path(__file__).resolve().parent.parent


def french_line(san, board=None):
    position = board.copy() if board is not None else diagrammes.chess.Board()
    words = []
    for token in san.split():
        move = position.parse_san(token)
        assert position.san(move) == token, 'Notation SAN imprécise'
        if position.turn:
            words.append(str(position.fullmove_number) + '.')
        elif not words:
            words.append(str(position.fullmove_number) + '…')
        words.append(token.translate(str.maketrans({'N':'C','B':'F','R':'T','Q':'D','K':'R'})))
        position.push(move)
    return ' '.join(words)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--write', action='store_true', required=True)
    parser.parse_args()
    manifest = ROOT / '_data/diagrammes.json'
    records = json.loads(manifest.read_text(encoding='utf-8'))
    by_file = {record['file']: record for record in records}
    additions = []
    for source in sorted((ROOT / '_data/ouvertures').glob('*.json')):
        data = json.loads(source.read_text(encoding='utf-8'))
        orientation = 'black' if data['side'] == 'Avec les Noirs' else 'white'
        items = data['steps'] + [data['plan'], data['exercise']]
        if data.get('lesson', {}).get('caseStudy'):
            items.append(data['lesson']['caseStudy'])
        for choice in data.get('workshop', {}).get('choices', []):
            assert choice['san'] == data['workshop']['startSan'] + ' ' + choice['lineSan'], 'Suite comparative incohérente'
            items.append(choice)
        items += data.get('variants', [])
        if data.get('trap'):
            items.append(data['trap'])
        for item in items:
            board = diagrammes.chess.Board()
            for move in item['san'].split():
                board.push_san(move)
            assert board.is_valid(), source.name
            checks = list(item.get('checks', []))
            if item.get('avoidSan'):
                alternative = diagrammes.chess.Board()
                for san in item['avoidSan'].split():
                    alternative.push_san(san)
                assert alternative.is_valid(), 'Défense non valide'
            if item.get('movesFr') and item in data.get('variants', []) + [data.get('trap')]:
                assert item['movesFr'] == french_line(item['san']), 'Notation française incohérente'
            if item.get('avoidFr'):
                assert item['avoidFr'] == french_line(item['avoidSan']), 'Défense affichée incohérente'
                assert item['solutionFr'] == french_line(item['solutionSan'], board), 'Solution affichée incohérente'
            if item.get('solutionSan'):
                expected_turn = item.get('turn', 'white') == 'white'
                assert board.turn == expected_turn, 'Trait incorrect : ' + source.name
                result = board.copy()
                for san in item['solutionSan'].split():
                    move = result.push_san(san)
                piece = result.piece_at(move.to_square).symbol()
                checks.append({'type': 'line', 'moves': item['solutionSan'],
                               'piece': diagrammes.chess.square_name(move.to_square) + ':' + piece})
            existing = by_file.get(item['diagram'])
            if existing:
                assert existing['moves'] == item['san'], 'Séquence déjà enregistrée différente'
                diagrammes.board_for(existing)
                continue
            record = {
                'file': item['diagram'], 'title': item['alt'],
                'orientation': orientation, 'fen': board.fen(en_passant='fen'),
                'moves': item['san'], 'kind': 'position', 'generated': True, 'checks': checks,
                'highlights': item.get('highlights', []),
            }
            diagrammes.board_for(record)
            additions.append((record, diagrammes.render(record, board)))
            by_file[record['file']] = record
    # Valider toutes les suites avant la première écriture.
    for record, svg in additions:
        (diagrammes.DIRECTORY / record['file']).write_text(svg, encoding='utf-8', newline='\n')
        records.append(record)
    manifest.write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(additions)} nouveaux diagrammes ; séquences et solutions légales.')


if __name__ == '__main__':
    main()
