# ScaleReach
Interface for Jane, our first callbot.

# Startup
```
git clone https://github.com/ScaleReach/scalereach
cd scalereach
npm i
npm run dev
```

# Deploy
Ensure .env file is in root directory (sibling to `/src` folder)

1. `mv .env .env.production` (else secrets wouldnt be accessed during `next build`)
2. `docker build -t scalereach .`
3. `docker run -p 3001:3001 scalereach`