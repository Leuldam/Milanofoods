import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
export const runtime = "nodejs";
function clean(value:unknown,max=500){return typeof value==="string"?value.trim().slice(0,max):"";}
export async function POST(req:NextRequest){
 try{
  const body=await req.json();
  const name=clean(body?.customer?.name,120), phone=clean(body?.customer?.phone,60), email=clean(body?.customer?.email,180);
  const method=body?.fulfillment?.method, payment=clean(body?.payment,80);
  if(!name||!phone||!Array.isArray(body?.items)||body.items.length===0) return NextResponse.json({error:"Please provide your name, phone number, and at least one product."},{status:400});
  if(!["delivery","pickup"].includes(method))return NextResponse.json({error:"Choose delivery or pickup."},{status:400});
  const normalized=[];
  for(const line of body.items){
   const p=products.find(x=>x.id===line.id);const qty=Number(line.qty);
   if(!p||!Number.isInteger(qty)||qty<1||qty>99)return NextResponse.json({error:"One or more cart items are invalid. Please review your cart."},{status:400});
   normalized.push({name:p.name,qty,price:p.price,size:p.size,lineTotal:p.price*qty});
  }
  const subtotal=normalized.reduce((s,x)=>s+x.lineTotal,0);
  const orderNumber=`MIL-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${crypto.randomUUID().slice(0,6).toUpperCase()}`;
  const fulfillment=body.fulfillment||{};
  const address=method==="delivery"?`${clean(fulfillment.city,120)} — ${clean(fulfillment.address,300)}`:`Pickup: ${clean(fulfillment.pickupLocation,250)}`;
  if(method==="delivery"&&(!clean(fulfillment.city)||!clean(fulfillment.address)))return NextResponse.json({error:"Please provide your delivery city and address."},{status:400});
  if(method==="pickup"&&!clean(fulfillment.pickupLocation))return NextResponse.json({error:"Please provide a preferred pickup location."},{status:400});
  const textMessage=[
   "🛍️ NEW MILANO FOODS ORDER",`Order: ${orderNumber}`,"",`Customer: ${name}`,`Phone: ${phone}`,email?`Email: ${email}`:"",`Fulfillment: ${method.toUpperCase()}`,`Address/location: ${address}`,`Payment preference: ${payment}`,"","ITEMS",...normalized.map(x=>`• ${x.name} (${x.size}) × ${x.qty} — ETB ${x.lineTotal.toLocaleString("en-ET")}`),"",`Subtotal: ETB ${subtotal.toLocaleString("en-ET")}`,"Delivery fee: To be confirmed",`Notes: ${clean(fulfillment.notes,500)||"None"}`,"","Please contact the customer to confirm availability, delivery fee, and payment."
  ].filter(Boolean).join("\n");
  let telegramSent=false;
  const token=process.env.TELEGRAM_BOT_TOKEN, chatId=process.env.TELEGRAM_CHAT_ID;
  if(token&&chatId){
   const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text:textMessage})});
   telegramSent=r.ok;
   if(!r.ok)console.error("Telegram notification failed",await r.text());
  }
  // TODO production: persist this validated order to PostgreSQL before notifications.
  // Email delivery should be wired to a verified provider; do not report it as sent until configured.
  console.info("Order request received", {orderNumber,subtotal,telegramSent,customerEmailProvided:Boolean(email)});
  return NextResponse.json({ok:true,orderNumber,telegramSent,message:"Order request received. Milano Foods will contact you to confirm the details."},{status:201});
 }catch(e){console.error("Order endpoint error",e);return NextResponse.json({error:"We could not submit your order. Please try again or contact Milano."},{status:500});}
}