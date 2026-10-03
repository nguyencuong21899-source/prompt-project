const equal = (a,b) => JSON.stringify(a) === JSON.stringify(b);
export function reconcileCatalog(remote, pending) {
  if (!pending) return {catalog:remote,pending:null};
  const prompts = {...pending.prompts};
  const taxonomy = {...pending.taxonomy};
  for (const [id,expected] of Object.entries(prompts)) {
    const actual=remote.prompts.find(prompt=>prompt.id===id);
    if (expected===null ? !actual : equal(actual,expected)) delete prompts[id];
  }
  for (const [kind,expected] of Object.entries(taxonomy)) {
    if (equal(remote[kind],expected)) delete taxonomy[kind];
  }
  if (!Object.keys(prompts).length && !Object.keys(taxonomy).length) return {catalog:remote,pending:null};
  const catalog={...remote,...taxonomy,prompts:remote.prompts.filter(prompt=>!Object.hasOwn(prompts,prompt.id))};
  catalog.prompts.push(...Object.values(prompts).filter(Boolean));
  catalog.prompts.sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}));
  return {catalog,pending:{...pending,prompts,taxonomy}};
}
