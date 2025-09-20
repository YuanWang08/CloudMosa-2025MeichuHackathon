FROM node:20-alpine

WORKDIR /app

# 複製 package.json 和 package-lock.json（如果存在）
COPY package*.json ./

# 安裝依賴
RUN npm install

# 複製應用程式程式碼
COPY . .

# 暴露端口
EXPOSE 3001

# 啟動應用程式
CMD ["npm", "run", "dev"]