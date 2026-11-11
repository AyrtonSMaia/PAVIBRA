/* Cadastros únicos para validação dos materiais e compatibilidade de backups. */
(function(root){
  const clean=s=>String(s??'').trim().replace(/\s+/g,' ');
  const key=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const groups=['category','status','quality'];
  function newId(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();if(globalThis.crypto?.getRandomValues)return Array.from(crypto.getRandomValues(new Uint8Array(16)),v=>v.toString(16).padStart(2,'0')).join('');return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)+'-'+Math.random().toString(36).slice(2)}
  const defaults={category:['Sem categoria','Postes','Estruturas primárias','Estrutura de fibra óptica','Equipamentos MT','Cabos MT','Cabos','Transformador e Estruturas','Luminária e Estruturas','Quadros de Iluminação','Componentes de quadros','Eletrocalha','Aterramentos','Padrão - Medidor','Estruturas de BT','Miscelâneas','Eletrodutos GALV e acessórios','Rede de Distribuição Compacta','Medidor EQUATORIAL'],status:['A confirmar','Em levantamento','Em cotação','Análise técnica','Pedido emitido','Em fabricação','Em transporte','Recebido (origem)','Recebido','Concluído'],quality:['Pendente','Em inspeção','Liberado','Bloqueado']};
  const aliases={'postes':'Postes','estruturas primarias':'Estruturas primárias','estrutura fibra':'Estrutura de fibra óptica','eqp. mt':'Equipamentos MT','cabos.mt':'Cabos MT'};
  function audit(data,action,detail){(data.catalogHistory??=[]).push({date:new Date().toISOString(),action,...detail})}
  function migrate(data){
    if(data.catalogVersion===1)return false;
    data.catalogs={};
    for(const g of groups)data.catalogs[g]=defaults[g].map((name,n)=>({id:g+'-'+n,name,active:true,isDefault:n===0,role:g==='quality'&&name==='Liberado'?'released':'pending'}));
    let corrected=0;
    for(const i of data.items){
      const previous=i.category;
      const c=clean(i.category);
      i.category=/^\d+$/.test(c)?'Componentes de quadros':aliases[key(c)]||c||'Sem categoria';
      if(previous!==i.category){corrected++;(i.history??=[]).push({date:new Date().toISOString(),fields:['Categoria padronizada: '+String(previous??'')+' → '+i.category]})}
      for(const g of groups){
        const value=clean(i[g])||defaults[g][0];
        const found=data.catalogs[g].find(o=>key(o.name)===key(value));
        if(found)i[g]=found.name;
        else{data.catalogs[g].push({id:g+'-import-'+data.catalogs[g].length,name:value,active:true,isDefault:false,role:'pending'});i[g]=value}
      }
    }
    data.catalogVersion=1;
    audit(data,'migration',{detail:'Listas de validação criadas; posições numéricas de componentes convertidas em categoria; origem preservada.',corrected});
    return true;
  }
  function get(data,g,id){const o=data.catalogs[g]?.find(o=>o.id===id);if(!o)throw Error('Cadastro não encontrado.');return o}
  function count(data,g,name){return data.items.filter(i=>i[g]===name).length}
  function checkName(data,g,name,ignore){name=clean(name);if(!name)throw Error('Informe um nome para a opção.');if(name.length>100)throw Error('Use até 100 caracteres.');if(data.catalogs[g].some(o=>o.id!==ignore&&key(o.name)===key(name)))throw Error('Esta opção já está cadastrada, inclusive entre as inativas.');return name}
  function add(data,g,name,role='pending'){
    name=checkName(data,g,name);const id=g+'-'+newId();
    data.catalogs[g].push({id,name,active:true,isDefault:false,role:g==='quality'&&role==='released'?'released':'pending'});
    audit(data,'create',{group:g,name});return id;
  }
  function update(data,g,id,name,role){
    const o=get(data,g,id);name=checkName(data,g,name,id);const old=o.name;
    const nextRole=g==='quality'&&role==='released'?'released':'pending';
    if(old===name&&o.role===nextRole)return 0;
    let affected=0;
    for(const i of data.items)if(i[g]===old){i[g]=name;(i.history??=[]).push({date:new Date().toISOString(),fields:[g+': '+old+' → '+name+(o.role!==nextRole?' · critério de liberação atualizado':'')]});affected++}
    o.name=name;o.role=nextRole;
    audit(data,'update',{group:g,old,name,affected,role:nextRole});return affected;
  }
  function toggle(data,g,id){const o=get(data,g,id);if(o.active&&o.isDefault)throw Error('Escolha outra opção padrão antes de inativar esta.');o.active=!o.active;audit(data,o.active?'activate':'deactivate',{group:g,name:o.name});return o.active}
  function setDefault(data,g,id){const o=get(data,g,id);if(!o.active)throw Error('Ative a opção antes de defini-la como padrão.');for(const r of data.catalogs[g])r.isDefault=r.id===id;audit(data,'default',{group:g,name:o.name})}
  function defaultName(data,g){return data.catalogs[g].find(o=>o.active&&o.isDefault)?.name||data.catalogs[g].find(o=>o.active)?.name||''}
  function options(data,g,current){return data.catalogs[g].filter(o=>o.active||o.name===current)}
  function draftError(data,draft,old){for(const g of groups){const o=data.catalogs[g].find(o=>o.name===draft[g]);if(!o)return 'Escolha uma opção cadastrada para '+({category:'categoria',status:'status de compra',quality:'status de qualidade'}[g])+'.';if(!o.active&&old?.[g]!==o.name)return 'A opção “'+o.name+'” está inativa. Escolha uma opção ativa.'}return ''}
  function validate(data){
    if(data.catalogVersion==null&&data.catalogs==null)return true;
    if(data.catalogVersion!==1||!data.catalogs)return false;
    for(const g of groups){const rows=data.catalogs[g];if(!Array.isArray(rows)||!rows.length||rows.some(o=>!o||typeof o.id!=='string'||typeof o.name!=='string'||!clean(o.name)||typeof o.active!=='boolean'||typeof o.isDefault!=='boolean'||!['pending','released'].includes(o.role)))return false;if(new Set(rows.map(o=>o.id)).size!==rows.length||new Set(rows.map(o=>key(o.name))).size!==rows.length||rows.filter(o=>o.isDefault).length!==1||!rows.some(o=>o.isDefault&&o.active))return false;if(data.items.some(i=>!rows.some(o=>o.name===i[g])))return false}
    return !data.catalogHistory||Array.isArray(data.catalogHistory);
  }
  function isReleased(data,item){return data.catalogs.quality.some(o=>o.name===item.quality&&o.role==='released')}
  root.StandardCatalog={migrate,count,add,update,toggle,setDefault,defaultName,options,draftError,validate,isReleased,groups,newId};
})(globalThis);
