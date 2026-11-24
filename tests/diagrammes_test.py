"""Régressions échiquéennes ; lancer py tests/diagrammes_test.py."""
import copy,importlib.util,io,json,pathlib,unittest
ROOT=pathlib.Path(__file__).resolve().parent.parent
spec=importlib.util.spec_from_file_location('diagrammes',ROOT/'scripts/diagrammes.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
DATA={r['file']:r for r in json.loads((ROOT/'_data/diagrammes.json').read_text(encoding='utf-8'))}

class DiagrammesTests(unittest.TestCase):
    def test_all_positions_and_solutions(self):
        for record in DATA.values():
            with self.subTest(record=record['file']):module.board_for(record)

    def test_mate_and_stalemate_are_not_interchangeable(self):
        record=copy.deepcopy(DATA['debutant-pat-dame.svg'])
        record['checks']=[{'type':'checkmate'}]
        with self.assertRaises(AssertionError):module.board_for(record)

    def test_position_must_match_the_announced_opening(self):
        record=copy.deepcopy(DATA['italienne.svg']);record['moves']='e4 e5 Nf3 Nc6 Bb5'
        with self.assertRaises(AssertionError):module.board_for(record)

    def test_white_cannot_move_a_pinned_piece_off_the_line(self):
        board=module.board_for(DATA['exercices-pdf-clouage.svg'])
        self.assertNotIn(module.chess.Move.from_uci('e2a2'),board.legal_moves)
        self.assertIn(module.chess.Move.from_uci('e2e8'),board.legal_moves)

    def test_svg_corresponds_to_board_for_both_orientations(self):
        for name in ['francaise-avance.svg','italienne.svg','promotion-pion.svg']:
            with self.subTest(name=name):
                record=DATA[name];pieces,marks,arrows,white=module.read_svg(module.DIRECTORY/name)
                self.assertEqual(pieces,module.board_for(record).piece_map())
                self.assertEqual(white,record['orientation']=='white')

    def test_swapped_square_colors_are_rejected(self):
        source=(module.DIRECTORY/'italienne.svg').read_text(encoding='utf-8')
        source=source.replace('#F0D9B5','__LIGHT__').replace('#B58863','#F0D9B5').replace('__LIGHT__','#B58863')
        with self.assertRaises(AssertionError):module.read_svg(io.StringIO(source))

    def test_material_claims_include_both_capture_and_recapture(self):
        record=copy.deepcopy(DATA['ouverture-francaise-atelier-automatisme.svg'])
        module.board_for(record)
        record['checks']=[{'type':'material','balance':0}]
        with self.assertRaises(AssertionError):module.board_for(record)

    def test_a_blocked_diagonal_is_not_an_attack(self):
        record=copy.deepcopy(DATA['ouverture-anglaise-atelier-occuper.svg'])
        record['checks']=[{'type':'attacks','from':'g2','targets':['d5']}]
        with self.assertRaises(AssertionError):module.board_for(record)
        record['checks']=[{'type':'notAttacks','from':'g2','targets':['d5']}]
        module.board_for(record)

    def test_queen_on_a5_does_not_check_through_the_c3_knight(self):
        record=copy.deepcopy(DATA['ouverture-scandinave-atelier-active.svg'])
        record['checks']=[{'type':'check'}]
        with self.assertRaises(AssertionError):module.board_for(record)

    def test_material_after_a_tactical_line_is_not_only_legality(self):
        record=copy.deepcopy(DATA['ouverture-gambit-dame-piege.svg'])
        check=next(c for c in record['checks'] if c.get('afterChecks'))
        check['afterChecks']=[{'type':'material','balance':-3}]
        with self.assertRaises(AssertionError):module.board_for(record)

    def test_sicilian_pawn_fork_really_attacks_both_pieces(self):
        record=copy.deepcopy(DATA['ouverture-sicilienne-piege.svg'])
        check=next(c for c in record['checks'] if c.get('afterChecks') and c['afterChecks'][0]['type']=='attacks')
        check['afterChecks'][0]['targets']=['c4','f3']
        with self.assertRaises(AssertionError):module.board_for(record)

if __name__=='__main__':unittest.main()
