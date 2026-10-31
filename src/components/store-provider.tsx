 "use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { products } from "@/lib/products";
export type CartLine = { id:string; name:string; slug:string; price:number; image:string; size:string; qty:number };
type StoreContextType = { cart:CartLine[]; add:(p:Omit<CartLine,"qty">,qty?:number)=>void; setQty:(id:string,qty:number)=>void; remove:(id:string)=>void; clear:()=>void; count:number; subtotal:number };
const StoreContext = createContext<StoreContextType | null>(null);
export function StoreProvider({children}:{children:React.ReactNode}) {
 const [cart,setCart] = useState<CartLine[]>([]);
 useEffect(()=>{try{const raw=localStorage.getItem("milano-cart");if(raw){const savedCart:CartLine[]=JSON.parse(raw);setCart(savedCart.map(item=>{const product=products.find(candidate=>candidate.id===item.id);return product?{...item,image:product.image}:item}))}}catch{}},[]);
 useEffect(()=>{try{localStorage.setItem("milano-cart",JSON.stringify(cart));}catch{}},[cart]);
 const value=useMemo<StoreContextType>(()=>({
  cart,
  add:(p,qty=1)=>setCart(old=>{const found=old.find(x=>x.id===p.id);return found?old.map(x=>x.id===p.id?{...x,qty:x.qty+qty}:x):[...old,{...p,qty}]}),
  setQty:(id,qty)=>setCart(old=>old.map(x=>x.id===id?{...x,qty:Math.max(1,Math.min(99,qty))}:x)),
  remove:(id)=>setCart(old=>old.filter(x=>x.id!==id)),
  clear:()=>setCart([]),
  count:cart.reduce((n,x)=>n+x.qty,0),
  subtotal:cart.reduce((n,x)=>n+x.price*x.qty,0)
 }),[cart]);
 return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(){const v=useContext(StoreContext);if(!v)throw new Error("StoreProvider missing");return v;}
