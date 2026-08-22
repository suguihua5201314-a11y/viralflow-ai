"use client";

export default function ConfirmDialog({open,title,description,confirmLabel="确认",tone="default",onConfirm,onCancel}:{open:boolean;title:string;description:string;confirmLabel?:string;tone?:"default"|"danger";onConfirm:()=>void;onCancel:()=>void}){
 if(!open)return null;
 return <div className="confirm-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onCancel()}}><section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title"><span>{tone==="danger"?"危险操作":"请确认操作"}</span><h2 id="confirm-title">{title}</h2><p>{description}</p><footer><button type="button" onClick={onCancel}>取消</button><button type="button" className={tone==="danger"?"danger":"primary"} onClick={onConfirm}>{confirmLabel}</button></footer></section></div>;
}
