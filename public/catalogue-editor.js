export function catalogueEditor(company, products, escape) {
 const entries=products.filter(p=>p.company_id===company?.id);
 return '<form id="edit-product" class="editor panel"><label>Articolo<select name="id"><option value="">Nuovo prodotto</option>'+entries.map(p=>'<option value="'+p.id+'">'+escape(p.sku+' · '+p.name)+(p.active?'':' (ritirato)')+'</option>').join('')+'</select></label><label>Nome<input name="name" required maxlength="160"></label><label>Codice<input name="sku"></label><label>Descrizione / formato<textarea name="description"></textarea></label><label>Prezzo unitario facoltativo<input name="price" type="number" min="0" step=".0001"></label><label>Foto prodotto<input type="file" name="photo" accept="image/png,image/jpeg,image/webp"></label><img class="edit-preview" hidden alt="Anteprima prodotto"><label><input type="checkbox" name="hide_photo"> Rimuovi foto</label><label><input type="checkbox" name="active" checked> Visibile nel catalogo cliente</label><button>Salva prodotto</button></form>';
}
export async function photoData(file) {
 const bitmap=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas'), factor=Math.min(1,800/Math.max(bitmap.width,bitmap.height));
  canvas.width=Math.max(1,Math.round(bitmap.width*factor));canvas.height=Math.max(1,Math.round(bitmap.height*factor));
  canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [.82,.65,.45,.28]){const result=canvas.toDataURL('image/webp',quality);if(result.length<94000)return result;}
  throw Error('Scegli una foto più semplice o più piccola.');
 }finally{bitmap.close()}
}
