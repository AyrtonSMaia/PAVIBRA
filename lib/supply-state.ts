import '../public/materiais-assets/catalogs.js';
const catalogs=(globalThis as any).StandardCatalog;
export const SEED_STATE=()=>{const data:any={schema:1,items:[],projects:[{name:'Cadastro inicial',description:'Cadastre os projetos ou importe a base da obra.'}],pq:[]};catalogs.migrate(data);return data};
export function stateError(data:any):string{
  if(!data||data.schema!==1||!Array.isArray(data.items)||!Array.isArray(data.projects)||!Array.isArray(data.pq)||data.items.length>10000)return 'Base de suprimentos inválida.';
  if(new Set(data.items.map((i:any)=>i?.id)).size!==data.items.length)return 'Existem materiais com identificadores duplicados.';
  if(!data.projects.length||data.projects.some((p:any)=>!p||typeof p.name!=='string'))return 'Cadastros de projeto inválidos.';
  for(const i of data.items){
    if(!i||typeof i.id!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(i.id)||typeof i.description!=='string'||!i.description.trim()||typeof i.unit!=='string'||!i.unit.trim()||typeof i.project!=='string'||!data.projects.some((p:any)=>p.name===i.project))return 'Material com identificação, descrição, unidade ou projeto inválido.';
    for(const k of ['quantity','received','released','applied','measured','cost'])if(i[k]!=null&&(typeof i[k]!=='number'||!Number.isFinite(i[k])||i[k]<0))return 'Quantidades e custos devem ser números positivos ou zero.';
    if(i.released!=null&&i.received!=null&&i.released>i.received)return 'Quantidade liberada superior à recebida.';
    if(i.applied!=null&&i.released!=null&&i.applied>i.released)return 'Quantidade aplicada superior à liberada.';
    if(i.pq&&!data.pq.some((p:any)=>p.code===i.pq))return 'Vínculo com item PQ inválido.';
    if(i.history&&(!Array.isArray(i.history)||i.history.some((h:any)=>!h||!Array.isArray(h.fields))))return 'Histórico de material inválido.';
  }
  try{if(!catalogs.validate(data))return 'Categorias ou status fora dos cadastros padrão.'}catch{return 'Cadastros padrão inválidos.'}
  return '';
}
