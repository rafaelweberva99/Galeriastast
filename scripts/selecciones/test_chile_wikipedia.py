"""python3 -I scripts/selecciones/test_chile_wikipedia.py"""
import importlib.util, os, unittest

spec = importlib.util.spec_from_file_location("cw", os.path.join(os.path.dirname(os.path.abspath(__file__)), "chile_wikipedia.py"))
cw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cw)

ROW = """|-
|781
|{{dts|13 November 2020}}
|Estadio Nacional, Santiago (H)
|{{fb|PER}}
|align=center bgcolor=#ddffdd|2–0
|2022 FIFA World Cup qualification
|[[Arturo Vidal|Vidal]] (2)
|align=center|{{nts|0}}
|<ref name="Elo"/>
|-
|1000
|{{dts|2 June 2024}}
|Estadio X, Y (A)
|{{fb|URU}}
|align=center bgcolor=#ffdddd|1–2 (4–5 p)
|[[Exhibition match#Association football|Friendly]]
|[[Eduardo Vargas|Vargas]] ([[Own goal|o.g.]])
|align=center|{{nts|0}}
|<ref name="Elo"/>
|-
"""


class Tests(unittest.TestCase):
    def test_parse_rows(self):
        rows = list(cw.parse("\n" + ROW + "\n"))
        self.assertEqual(len(rows), 2)
        a, b = rows
        self.assertEqual((a["date"], a["code"], a["gf"], a["ga"], a["side"]), ("2020-11-13", "PER", 2, 0, "H"))
        self.assertEqual(a["competition_id"], "eliminatorias")
        self.assertEqual(a["scorers"], [("Arturo Vidal", 2, False, False)])
        self.assertEqual((b["side"], b["gf"], b["ga"]), ("A", 1, 2))
        self.assertEqual(b["pens"], (4, 5))
        self.assertEqual(b["competition_id"], "amistoso-seleccion")
        self.assertTrue(b["scorers"][0][3])  # autogol

    def test_competitions(self):
        self.assertEqual(cw.competition("[[2015 Copa América|2015 Copa América]]")[0], "copa-america")
        self.assertEqual(cw.competition("2014 FIFA World Cup")[0], "mundial")
        self.assertEqual(cw.competition("[[2017 FIFA Confederations Cup]]")[0], "confederaciones")


if __name__ == "__main__":
    unittest.main()
