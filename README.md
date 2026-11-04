# YT Dislikes PS

Extensão que mostra uma nota estimada de 0 a 10 no YouTube. Passe o mouse sobre uma miniatura para ver a nota e as visualizações. Na página do vídeo, o painel abaixo do título também mostra a proporção de likes e dislikes.

## Downloads

| Navegador | Arquivo | Instalação |
| --- | --- | --- |
| Chrome | [Baixar ZIP](https://github.com/psalles00/yt-dislikes-ps/releases/latest/download/yt-dislikes-ps-chrome.zip) | Extraia o ZIP. Em `chrome://extensions`, ative o **Modo do desenvolvedor**, escolha **Carregar sem compactação** e selecione a pasta que contém `manifest.json`. |
| Firefox 140+ | [Baixar XPI](https://github.com/psalles00/yt-dislikes-ps/releases/latest/download/yt-dislikes-ps-firefox.xpi) | Salve o arquivo. Em `about:debugging#/runtime/this-firefox`, escolha **Carregar extensão temporária** e selecione o XPI. A extensão sem assinatura da Mozilla é removida ao reiniciar o Firefox. |
| Safari no macOS 14+ | [Baixar app para macOS](https://github.com/psalles00/yt-dislikes-ps/releases/latest/download/yt-dislikes-ps-safari-macos.zip) | Extraia o ZIP e abra o app que contém a extensão. Ative-a em **Safari → Ajustes → Extensões**. Este é um pacote de desenvolvimento, com assinatura Apple Development. Em outros Macs, a configuração padrão do sistema pode impedir a execução. |

[Ver releases e checksums](https://github.com/psalles00/yt-dislikes-ps/releases)

## Dados

A nota é calculada no navegador com `10 × likes ÷ (likes + 2 × dislikes)`. A contagem de dislikes é estimada. Quando você abre um vídeo ou mantém o ponteiro sobre sua miniatura, a extensão consulta o ID público do vídeo no [Return YouTube Dislike](https://returnyoutubedislike.com/), sem cookies ou credenciais. O cache fica no armazenamento local da extensão. O painel Jabrek é opcional e só carrega ao ser expandido.

## Empacotamento

Execute `python3 scripts/package.py` para gerar os downloads de Chrome e Firefox em `dist/`. No macOS, passe também `--safari-app "/Applications/YT Dislikes PS.app"` para arquivar uma compilação assinada da mesma versão.
