 "use client";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Product, money } from "@/lib/products";
import { useStore } from "./store-provider";
export function ProductCard({product}:{product:Product}){
 const {add}=useStore();
 return <article className="product-card"><Link href={`/products/${product.slug}`} className={`product-photo${product.category==="Mojito Syrups"?" product-photo-bottle":""}`}><Image src={product.image} alt={product.name} fill sizes="(max-width:720px) 48vw, (max-width:1000px) 30vw, 23vw"/>{product.badge&&<span className="product-tag">{product.badge}</span>}</Link><div className="product-info"><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><div className="product-category">{product.category} · {product.size}</div><div className="product-bottom"><span className="price">{money(product.price)}</span><button className="add-mini" onClick={()=>add({id:product.id,name:product.name,slug:product.slug,price:product.price,image:product.image,size:product.size})}><Plus size={14}/> Add</button></div></div></article>
}