// Text/selection forms can remain editable while their request is running.
// Reset only the exact submitted values; newer drafts belong to the user.
export function sameFormValues(submitted,current){
 const before=[...submitted],after=[...current];
 return before.length===after.length&&before.every(([key,value],index)=>key===after[index][0]&&value===after[index][1]);
}
