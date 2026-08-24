// Genera la version publicable del juego a partir de index.html.
// El contenedor de Artifacts aporta <!doctype>, <html>, <head> y <body>,
// asi que aqui solo va el <title>, el <style> y el contenido del body.
const fs=require('fs'), path=require('path');
const raiz=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(raiz,'index.html'),'utf8').split('\n');
const i=(re)=>{ const n=src.findIndex(l=>re.test(l)); if(n<0) throw new Error('no encuentro '+re); return n; };
const s0=i(/^<style>/), s1=i(/^<\/style>/), b0=i(/^<body>/), b1=i(/^<\/body>/);
const salida=[
  '<title>Uni·Quest Passau</title>',
  ...src.slice(s0, s1+1),
  ...src.slice(b0+1, b1),
].join('\n');
const dest=path.join(raiz,'uniquest.artifact.html');
fs.writeFileSync(dest, salida);
console.log('escrito', dest, '('+salida.length+' bytes)');
