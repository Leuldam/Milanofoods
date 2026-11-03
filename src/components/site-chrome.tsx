 "use client";
import Link from "next/link";
import { ShoppingBag, Search, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSelector } from "./language-selector";
import { useStore } from "./store-provider";
export function SiteHeader(){
 const {count}=useStore(); const [open,setOpen]=useState(false);
 const links=[["Home","/"],["Products","/products"],["Recipes","/recipes"],["About Us","/about"],["Contact","/contact"]];
 return <header className="site-header"><div className="wrap header-inner">
  <Link href="/" className="brand" aria-label="Milano Foods home"><span className="brand-main">Milano</span><span className="brand-sub">FOODS</span></Link>
  <nav className="nav">{links.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>
  <div className="header-actions"><Link className="icon-button" href="/products" aria-label="Search products"><Search size={18}/></Link><LanguageSelector /><Link className="icon-button" href="/cart" aria-label={`Cart, ${count} items`}><ShoppingBag size={19}/>{count>0&&<span className="cart-count">{count}</span>}</Link><Link className="btn btn-small desktop-shop" href="/products">Shop Now</Link><button className="icon-button mobile-menu" onClick={()=>setOpen(!open)} aria-label={open?"Close menu":"Open menu"} aria-expanded={open} aria-controls="mobile-site-navigation">{open?<X/>:<Menu/>}</button></div>
 </div>{open&&<nav className="mobile-nav" id="mobile-site-navigation">{links.map(([label,href])=><Link key={href} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}<Link href="/cart" onClick={()=>setOpen(false)}>Shopping Cart ({count})</Link></nav>}</header>
}
export function SiteFooter(){
 const [categories,setCategories]=useState<{id:string;name:string;slug:string}[]>([]);
 useEffect(()=>{let active=true;async function loadCategories(){try{const response=await fetch("/api/categories",{cache:"no-store"});if(!response.ok)throw new Error("Unable to load footer categories.");const data=await response.json() as {id:string;name:string;slug:string}[];if(active)setCategories(data);}catch(error){console.error("Footer product categories could not be loaded:",error);}}void loadCategories();return()=>{active=false;}},[]);
 return <footer className="footer"><div className="wrap"><div className="footer-grid">
  <div><Link href="/" className="brand"><span className="brand-main">Milano</span><span className="brand-sub">FOODS</span></Link><p>Premium flavors for drinks, desserts, and everyday moments. Discover the Milano product range and find inspiration for your next creation.</p></div>
  <div><h4>Explore</h4><div className="footer-links"><Link href="/products">All Products</Link>{categories.map((category)=><Link key={category.id} href={`/products?category=${encodeURIComponent(category.name)}`}>{category.name}</Link>)}<Link href="/recipes">Recipes</Link></div></div>
  <div><h4>Milano</h4><div className="footer-links"><Link href="/about">About Us</Link><Link href="/contact">Contact</Link><Link href="/delivery">Delivery Information</Link><Link href="/pickup">Pickup Information</Link></div></div>
  <div><h4>Customer Care</h4><div className="footer-links"><Link href="/contact">Order Support</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms & Conditions</Link><Link href="/cart">Shopping Cart</Link></div></div>
 </div><div className="footer-bottom"><span>© {new Date().getFullYear()} Milano Foods. All rights reserved.</span><span>Made for flavor · Ethiopia</span><a href="https://hadatradingplc.ethiodeploy.com/" target="_blank" rel="noopener noreferrer">Powered by HADA</a></div></div></footer>
}