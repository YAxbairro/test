# Lista de planos do video final BCV 51 anos.
# (clip, batidas, inicio_preferido_s ou None=auto, efeito)
# Musica: "Moving Up" (Staffan Carlen / Origo, Epidemic Sound), edit de 90 s, 110 BPM.
# Grelha: batida k em 0.011 + k*60/110 s. Drop na batida 33 (18.0 s). Pancada final na batida 154 (84.0 s).
INTRO = [  # batidas 0-33: calmo, dissolves, push-ins
    ("C1052", 8, None, "push"),      # exterior do edificio a noite + logo 51
    ("C1054", 4, 1.0, None),         # convidados a chegar
    ("C0941", 4, None, "push"),      # parede 51
    ("C0948", 4, None, None),        # sala vista de cima, luzes
    ("C0970", 4, None, "push"),      # centro de mesa com lirios
    ("C0949", 3, None, "push"),      # prato + menu
    ("C0945", 3, None, None),        # cupcakes 51
    ("C0959", 3, None, None),        # bolo BCV
]
MAIN = [  # batidas 33-154: drop, cortes no ritmo
    # chegadas e recepcao
    ("C0987", 4, 2.0, None), ("C1005", 2, None, None), ("C0991", 2, None, None),
    ("C0989", 2, 0.0, None), ("C1026", 2, 0.5, None), ("C1013", 2, 0.0, None),
    ("C0985", 2, None, None), ("C0993", 2, None, None), ("C0992", 2, None, None),
    ("C1048", 2, None, None),
    # convivio e comida
    ("C1040", 2, None, None), ("C1033", 2, None, None), ("C1044", 2, None, None),
    ("C0940", 2, None, None), ("C1172", 2, None, None), ("C1061", 2, 0.5, None),
    ("C1176", 4, 1.0, None), ("C1103", 2, None, None),
    # animacao: DJ, MC, banda
    ("C1101", 2, None, None), ("C1099", 2, None, None), ("C1115", 2, None, None),
    ("C1137", 4, None, "push"), ("C1149", 2, None, None), ("C1153", 2, None, None),
    ("C1157", 4, None, None),
    # bolo e brinde (climax)
    ("C1179", 4, 5.0, None), ("C1183", 2, 10.0, None), ("C1182", 2, None, None),
    ("C1186", 4, 2.0, None), ("C1196", 2, None, None), ("C1197", 2, 5.0, None),
    ("C1193", 2, 1.0, None),
    # festa
    ("C1204", 4, None, None), ("C1214", 2, None, None), ("C1206", 2, None, None),
    ("C1219", 2, None, None), ("C1223", 2, None, None), ("C1209", 2, None, None),
    ("C1216", 2, None, None), ("C1224", 4, None, None),
    # fecho
    ("C1170", 2, None, None), ("C1210", 2, None, None), ("C1046", 2, None, None),
    ("C1018", 2, None, None), ("C1202", 4, None, None), ("C1145", 4, None, "push"),
    ("C0916", 4, None, "push"), ("C1053", 5, None, "push"),
]
