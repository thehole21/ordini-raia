import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import handler from '../api/portal.mjs';
const root=resolve('public');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
createServer(async(req,res)=>{
  try {
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/api/portal') return await handler(req,res);
    const file=resolve(root, '.'+(path==='/'?'/index.html':decodeURIComponent(path)));
    if(!file.startsWith(root+"\\")&&!file.startsWith(root+'/')) {res.writeHead(403);return res.end();}
    res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(await readFile(file));
  }catch{res.writeHead(404);res.end('Pagina non trovata');}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Ordini RAIA: http://localhost:${process.env.PORT||3000}`));
