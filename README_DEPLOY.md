# BH Agro - দুই সাইট (SR + Admin), একই ডাটাবেস

## ফাইল স্ট্রাকচার (যা নতুন/বদলেছে)
```
src/
  apps/
    types.ts            রুলসের ফরম্যাট
    sr/rules.ts         ★ এসআর সাইটের রুলস (কোন পেজ, কী লিখতে পারবে)
    admin/rules.ts      ★ অ্যাডমিন সাইটের রুলস
  config/
    appMode.ts          বিল্ড mode (sr/admin) দেখে সঠিক রুলস বেছে নেয়
    firebase.ts         Firebase কনফিগ (env থেকে)
  modules/              দুই সাইটের শেয়ার্ড কোড (আগের মতোই)
  main.ts               শেয়ার্ড কন্ট্রোলার
```
রুলস বদলাতে চাইলে শুধু `apps/sr/rules.ts` বা `apps/admin/rules.ts` খুলুন।

## দুই সাইটের পার্থক্য
| | SR সাইট | অ্যাডমিন সাইট |
|---|---|---|
| লগইন | শুধু SR | শুধু Admin |
| পেজ | home, customers, order_booking, products, my_orders, reports | সব |
| ডাটাবেসে লিখতে পারে | orders, customers, products | সব (srs, admins সহ) |
| ডাটাবেস সেটিংস বাটন | নেই | আছে |
| প্রথম অ্যাডমিন তৈরি বাটন | নেই | আছে |
| সার্চ ইঞ্জিন | আসবে | noindex |

## লোকালে চালানো
```
npm install
cp .env.example .env.local     # Firebase মান বসান
npm run dev:sr                 # http://localhost:3000
npm run dev:admin              # http://localhost:3001
```

## ডিপ্লয় (GitHub-এ কোড পুশ করার পর, একই রিপো থেকে দুটো সাইট)

### Cloudflare Pages (সুপারিশ)
প্রতিটার জন্য: Workers & Pages → Create → Pages → Connect to Git → একই রিপো
- SR সাইট:    Build command `npm run build:sr`,    Output directory `dist/sr`
- Admin সাইট: Build command `npm run build:admin`, Output directory `dist/admin`

### Netlify
Add new site → Import from Git → একই রিপো, দুইবার:
- SR সাইট:    Build command `npm run build:sr`,    Publish directory `dist/sr`
- Admin সাইট: Build command `npm run build:admin`, Publish directory `dist/admin`

### দুই সাইটেই Environment variables (একই মান)
```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
```
env বদলালে আবার ডিপ্লয় (Redeploy) করতে হয়।

ফলাফল: দুটো আলাদা লিংক, যেমন `bhagro-sr.pages.dev` আর `bhagro-admin.pages.dev`।

## মনে রাখার বিষয়
- ডাটাবেস এখনও Test Mode (সবার জন্য খোলা)। আসল ডাটা তোলার আগে Rules ঠিক করুন।
- এসআর সাইট ডাটাবেসের `srs`/`admins` অংশ কখনো ওভাররাইট করে না।
- "Reset Local" এখন ক্লাউড ডাটা মোছে না, শুধু ওই ডিভাইসের ক্যাশ খালি করে।
- ডিলিট করা এসআরের অর্ডার থাকে, তবে এসআর-ওয়াইজ রিপোর্ট ও আইডি পুনর্ব্যবহারের সমস্যা এখনও ঠিক করা হয়নি।
