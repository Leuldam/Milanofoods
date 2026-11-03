export type Product = { id:string; sku?:string; slug:string; name:string; category:string; price:number; image:string; description:string; badge?:string; size:string; flavor?:string | null; variantType?:string | null; isPublished?:boolean; minimumOrderQuantity?:number; promotionEnabled?:boolean; promotionDiscountPercent?:string | number | null; packagingOptions?:{id:string;label:string;unitsPerPackage:number}[]; galleryImageUrls?:string[]; };
const mojitoSyrupImage = "/images/milano-mint-bottle-cutout.png";
export const products: Product[] = [
 {id:"mint",slug:"mint-mojito-syrup",name:"Mint Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A refreshing mint-forward syrup for bright, cooling beverage creations.",badge:"Bestseller",size:"750 ml"},
 {id:"strawberry",slug:"strawberry-mojito-syrup",name:"Strawberry Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A vibrant strawberry flavor for colorful mocktails and fruit drinks.",size:"750 ml"},
 {id:"pineapple",slug:"pineapple-mojito-syrup",name:"Pineapple Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A tropical pineapple flavor for refreshing beverage recipes.",size:"750 ml"},
 {id:"mango",slug:"mango-mojito-syrup",name:"Mango Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A sunny mango flavor for tropical drinks and creative mocktails.",size:"750 ml"},
 {id:"lemon",slug:"lemon-mojito-syrup",name:"Lemon Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A bright citrus-style syrup for fresh and lively drinks.",size:"750 ml"},
 {id:"tropical",slug:"tropical-mojito-syrup",name:"Tropical Mojito Syrup",category:"Mojito Syrups",price:480,image:mojitoSyrupImage,description:"A tropical-inspired flavor for colorful signature beverages.",size:"750 ml"},
 {id:"peach",slug:"peach-mojito-syrup",name:"Peach Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A soft, fruity peach flavor for refreshing drinks.",size:"750 ml"},
 {id:"orange",slug:"orange-mojito-syrup",name:"Orange Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A lively orange flavor for colorful beverage menus.",size:"750 ml"},
 {id:"coconut",slug:"coconut-mojito-syrup",name:"Coconut Mojito Syrup",category:"Mojito Syrups",price:450,image:mojitoSyrupImage,description:"A tropical coconut-inspired syrup for creative drinks.",size:"750 ml"},
 {id:"special",slug:"milano-special-syrup",name:"Milano Special Syrup",category:"Mojito Syrups",price:520,image:mojitoSyrupImage,description:"A signature flavor concept from the Milano range. Confirm formulation and product details before launch.",badge:"Signature",size:"750 ml"}
];
export const categories = [
 {name:"Mojito Syrup",category:"Mojito Syrups",slug:"mojito-syrups",description:"Choose from refreshing, fruit-inspired syrup flavors.",image:mojitoSyrupImage},
 {name:"Ice Cream Powder",category:"Ice Cream Powders",slug:"ice-cream-powders",description:"Strawberry, chocolate, mango, and vanilla in hard or soft powder.",image:"/images/milanoice.png"},
 {name:"Milkshake Powder",category:"Milkshake Powders",slug:"milkshake-powders",description:"Four flavors in 5 kg powder and 5 L liquid options.",image:"/images/milanomilk.png"}
];
export const recipes = [
 {
  slug:"strawberry-mojito",
  title:"Strawberry Mojito",
  category:"Mojito & Fruit Drinks",
  time:"5 min",
  serves:"1 glass",
  image:"https://images.unsplash.com/photo-1497534446932-c925b458314e?auto=format&fit=crop&w=1000&q=85",
  description:"A bright, berry-inspired cooler with Milano strawberry syrup, fresh lime, mint, and sparkling water.",
  ingredients:["1 cup ice","30 ml Milano strawberry mojito syrup, or to taste","20 ml fresh lime juice","6–8 fresh mint leaves","180 ml chilled sparkling water","Fresh strawberry and lime to garnish"],
  steps:["Add the mint and lime juice to a tall glass. Press the mint gently to release its aroma without tearing it into small pieces.","Fill the glass with ice, then pour in the Milano strawberry syrup.","Top with sparkling water and stir gently to combine.","Garnish with strawberry and lime. Serve cold."]
 },
 {
  slug:"tropical-refresh",
  title:"Tropical Refresh",
  category:"Mojito & Fruit Drinks",
  time:"6 min",
  serves:"2 glasses",
  image:"https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=1000&q=85",
  description:"A sunny fruit cooler that brings tropical syrup, citrus, and bubbles together.",
  ingredients:["60 ml Milano tropical mojito syrup, or to taste","200 ml chilled orange juice","150 ml chilled pineapple juice","150 ml sparkling water","2 cups ice","Orange or pineapple slices to garnish"],
  steps:["Add the tropical syrup, orange juice, and pineapple juice to a jug.","Stir until evenly mixed, then add the ice.","Pour into two glasses and top each with sparkling water.","Garnish with fresh fruit and serve immediately."]
 },
 {
  slug:"creamy-milkshake",
  title:"Creamy Milano Milkshake",
  category:"Milkshakes",
  time:"5 min",
  serves:"1 tall glass",
  image:"https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=1000&q=85",
  description:"A thick, café-style shake made with chilled milk and Milano milkshake powder.",
  ingredients:["250 ml cold milk","1 serving Milano milkshake powder, measured according to the package directions","1 cup ice, optional","Whipped cream or fruit to garnish, optional"],
  steps:["Pour the cold milk into a blender.","Add one serving of Milano milkshake powder using the measurement on its package.","Blend until smooth and creamy. Add ice if you prefer a colder, thicker shake.","Pour into a chilled glass, garnish as desired, and serve immediately."]
 }
];
export const money = (n:number) => `ETB ${n.toLocaleString("en-ET")}`;
