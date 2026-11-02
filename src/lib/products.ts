export type Product = { id:string; slug:string; name:string; category:string; price:number; image:string; description:string; badge?:string; size:string; };
const mojitoSyrupImage = "/images/milano-mint-bottle-cutout.png";
export const products: Product[] = [
 {id:"mint",slug:"mint-mojito-syrup",name:"Mint Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A refreshing mint-forward syrup for bright, cooling beverage creations.",badge:"Bestseller",size:"750 ml"},
 {id:"strawberry",slug:"strawberry-mojito-syrup",name:"Strawberry Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A vibrant strawberry flavor for colorful mocktails and fruit drinks.",size:"750 ml"},
 {id:"pineapple",slug:"pineapple-mojito-syrup",name:"Pineapple Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A tropical pineapple flavor for refreshing beverage recipes.",size:"750 ml"},
 {id:"mango",slug:"mango-mojito-syrup",name:"Mango Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A sunny mango flavor for tropical drinks and creative mocktails.",size:"750 ml"},
 {id:"lemon",slug:"lemon-mojito-syrup",name:"Lemon Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A bright citrus-style syrup for fresh and lively drinks.",size:"750 ml"},
 {id:"tropical",slug:"tropical-mojito-syrup",name:"Tropical Mojito Syrup",category:"Mojito Syrups",price:480,image:mojitoSyrupImage,description:"A tropical-inspired flavor for colorful signature beverages.",size:"750 ml"},
 {id:"icecream",slug:"ice-cream-powder",name:"Ice Cream Powder",category:"Ice Cream Powders",price:650,image:"https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=85",description:"A convenient base for preparing creamy frozen desserts. Follow the verified package instructions.",badge:"Popular",size:"1 kg"},
 {id:"milkshake",slug:"milkshake-powder",name:"Milkshake Powder",category:"Milkshake Powders",price:580,image:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=900&q=85",description:"A powder mix for preparing delicious milkshake creations.",size:"1 kg"},
 {id:"peach",slug:"peach-mojito-syrup",name:"Peach Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A soft, fruity peach flavor for refreshing drinks.",size:"750 ml"},
 {id:"orange",slug:"orange-mojito-syrup",name:"Orange Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A lively orange flavor for colorful beverage menus.",size:"750 ml"},
 {id:"coconut",slug:"coconut-mojito-syrup",name:"Coconut Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A tropical coconut-inspired syrup for creative drinks.",size:"750 ml"},
 {id:"special",slug:"milano-special-syrup",name:"Milano Special Syrup",category:"Mojito Syrups",price:520,image:mojitoSyrupImage,description:"A signature flavor concept from the Milano range. Confirm formulation and product details before launch.",badge:"Signature",size:"750 ml"}
];
export const categories = [
 {name:"Mojito Syrups",slug:"mojito-syrups",description:"Bright, fruit-inspired flavors for refreshing drinks.",image:mojitoSyrupImage},
 {name:"Ice Cream Powders",slug:"ice-cream-powders",description:"Create delicious frozen dessert experiences.",image:"https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=1200&q=85"},
 {name:"Milkshake Powders",slug:"milkshake-powders",description:"Make every shake a moment worth savoring.",image:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1200&q=85"}
];
export const recipes = [
 {slug:"strawberry-mojito",title:"Strawberry Mojito",category:"Mojito & Fruit Drinks",time:"5 min",image:"https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1000&q=85",description:"A bright, berry-inspired mocktail with fresh mint and citrus."},
 {slug:"tropical-refresh",title:"Tropical Refresh",category:"Mojito & Fruit Drinks",time:"6 min",image:"https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1000&q=85",description:"A colorful tropical drink idea for sunny afternoons."},
 {slug:"creamy-milkshake",title:"Creamy Milkshake",category:"Milkshakes",time:"5 min",image:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=85",description:"A smooth milkshake made for a café-style treat."}
];
export const money = (n:number) => `ETB ${n.toLocaleString("en-ET")}`;
