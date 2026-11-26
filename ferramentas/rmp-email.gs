// Localizador de Estacas – envio dos RMPs por e-mail (Google Apps Script, na conta Gmail que vai enviar)
// 1) script.google.com > Novo projeto > apague o conteúdo e cole este código > Salvar.
// 2) Configurações do projeto (engrenagem) > Propriedades do script > Adicionar: CHAVE = uma senha longa (a mesma vai no app).
// 3) Implantar > Nova implantação > tipo "App da Web" > Executar como: Eu > Quem pode acessar: Qualquer pessoa > Implantar > autorize o Gmail.
// 4) Copie a URL do app da Web (termina em /exec) e cole no app: Controle de RMPs > E-mail dos RMPs, junto com a CHAVE.
function doPost(e){
  var out=function(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)};
  try{
    var d=JSON.parse(e.postData.contents);
    var chave=PropertiesService.getScriptProperties().getProperty('CHAVE');
    if(!chave||d.chave!==chave)return out({ok:false,erro:'chave inválida'});
    var para=(d.para||[]).filter(function(x){return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)});
    if(!para.length)return out({ok:false,erro:'sem destinatário válido'});
    var anexos=(d.anexos||[]).map(function(a){return Utilities.newBlob(Utilities.base64Decode(a.b64),a.tipo||'application/octet-stream',a.nome)});
    GmailApp.sendEmail(para.join(','),String(d.assunto||'RMP').slice(0,250),String(d.texto||''),{htmlBody:String(d.html||''),attachments:anexos,name:String(d.remetente||'Neovia Restauração')});
    return out({ok:true,cota:MailApp.getRemainingDailyQuota()});
  }catch(err){return out({ok:false,erro:String(err&&err.message||err)})}
}
function doGet(){return ContentService.createTextOutput('Envio de RMP ativo.')}
