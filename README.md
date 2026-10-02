# Localizador de Estacas — BR-277 B2+B3

Aplicativo web para acompanhamento em campo do projeto de restauração da BR-277/PR (Blocos 2 e 3). Tem três páginas, acessíveis pelo menu lateral:

1. **Localização estaca**: tela cheia com a estaca atual pelo GPS, no formato "estaca + deslocamento" (ex.: 181+020 + 13 m). A posição é projetada sobre o eixo e interpolada entre as estacas de 20 m. Mostra a precisão do GPS, a distância ao eixo, o status do acompanhamento e avisos de permissão negada, falta de sinal, precisão baixa ou posição fora do trecho.
2. **Estacas BR-277 B2+B3**: mapa com os painéis ESTAQUEAMENTO e SOLUÇÕES, os panos do R08 por sentido e faixa, os drenos DR/DP e filtros.
3. **Calculadora de programação**: quantidade de CBUQ dos panos que cruzam um intervalo de km (ex.: 236+300 a 237+100), filtrada por pista e sentido. Fórmula: comprimento × largura × espessura ÷ 100 × densidade.
4. **Foto georreferenciada**: câmera traseira com as marcas-d'água gravadas na imagem: logotipos da Neovia e da Via Araucária, latitude e longitude, data e hora, estaca, rodovia BR-277 e uma nota. A posição é lida no momento da foto. Se o GPS falhar ou estiver com baixa precisão, isso aparece na própria imagem. Para salvar, a foto é enviada à folha de compartilhamento do iPhone (opção Salvar Imagem).

## Dados
- Estacas e coordenadas: `B2B3_KMZ_Estaca.kmz`, com 6.961 estacas de 164+700 a 303+800 e hodômetro contínuo a cada 20 m. O comprimento de cada km varia de 900 a 1.120 m.
- Soluções: R08 Unifilar de Soluções B2+B3 BR-277.
- A largura das faixas não consta na base. A calculadora usa por padrão 3,60 m para faixa 1 e faixa 2/3 e 2,50 m para acostamento, e densidade de 2,528 t/m³. Todos os valores podem ser editados e ficam salvos no aparelho.

## Uso
O aplicativo agora exige login e fica no Firebase Hosting (pasta `firebase/`). Endereço: https://localizador-estacas.web.app. O endereço antigo do GitHub Pages foi desativado (mostra só um aviso).

Abra o endereço novo no Safari, entre com a conta liberada pelo administrador e permita a localização. Para instalar no iPhone: Compartilhar → Adicionar à Tela de Início. Depois de instalado, funciona offline para os dados e para os trechos de mapa já visualizados.

## Estrutura
- `index.html`: aviso de endereço desativado (o app antigo continua no histórico do git)
- `sw.js`, `manifest.webmanifest`, `icon-*.png`: instalação e cache offline
- `fonte/`: modelo do app, scripts de preparo dos dados e lista de panos (`panos_R08_B2B3.csv`)

## Login e permissões (pasta `firebase/`)
- `firestore.rules`: regras do servidor. Sem login, sem cadastro ativo ou sem página liberada, a base do projeto não é entregue. Só o administrador principal (igordalmolin.eng@gmail.com, e-mail verificado) gerencia usuários, perfis, convites e a base.
- `src/auth.src.js`: tela de login (Google ou e-mail e senha), espera de liberação, painel de Administração (usuários, perfis de acesso, base do projeto).
- `public/`: app publicado, **sem** a base embutida (a base é carregada do Firestore depois do login).
- `test/`: testes das regras e teste de ponta a ponta no emulador.
- `.github/workflows/firebase.yml`: roda os testes a cada alteração e publica no Firebase quando o secret `FIREBASE_SERVICE_ACCOUNT` está cadastrado. O relatório dos testes fica no ramo `ci-results`.
- Para regerar `public/`: `python3 fonte/build_fb.py` (precisa de `fonte/package/dist/leaflet.css` e dos logotipos).
