# Localizador de Estacas — BR-277 B2+B3

Aplicativo web de mapa para acompanhamento do projeto de restauração da BR-277/PR (Blocos 2 e 3) em campo.

- **Estaqueamento:** a posição do GPS é projetada sobre o eixo e interpolada entre as estacas de 20 m, para estimar a estaca atual (ex.: 181+037). O painel também mostra a precisão do GPS e a distância ao eixo.
- **Soluções:** mostra as soluções do R08 por sentido e faixa (Faixa 1, Faixa 2/3 e acostamento), além dos drenos DR/DP. Blocos de 20 m seguidos com a mesma solução formam um pano, que é dividido quando muda o marco km.
- **Filtros:** por sentido, faixa e solução.
- **Offline:** instalável no iPhone pelo Safari ("Adicionar à Tela de Início"). Funciona sem sinal para os dados e para os trechos de mapa já visualizados.

## Uso
Abra o endereço do GitHub Pages no Safari e permita o acesso à localização.

## Estrutura
- `index.html`: aplicativo completo, com os dados embutidos
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: instalação e cache offline
- `fonte/`: modelo do app, scripts de preparo dos dados e lista de panos (`panos_R08_B2B3.csv`)

Fonte dos dados: R08 Unifilar de Soluções B2+B3 BR-277 e KMZ de estacas (6.961 estacas, 164+700 a 303+800).
