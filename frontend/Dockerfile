# 多阶段构建 Dockerfile for Salary System V3 Frontend
# 使用最新的 Node.js LTS 版本和高效的生产部署

# ==========================================
# 阶段 1: 构建阶段
# ==========================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装构建依赖
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# 复制 package 文件并安装依赖
COPY package*.json ./
RUN npm ci --only=production --silent && \
    npm cache clean --force

# 复制源代码
COPY . .

# 复制构建产物（从 GitHub Actions 传入）
# 注意：这假设构建产物已通过 Actions 生成
COPY dist/ ./dist/

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# ==========================================
# 阶段 2: 生产运行时
# ==========================================
FROM nginx:stable-alpine AS production

# 安装 curl 用于健康检查
RUN apk add --no-cache curl

# 创建非 root 用户
RUN addgroup -g 1001 -S appuser && \
    adduser -S appuser -u 1001

# 复制自定义 nginx 配置
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # 启用 gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # 缓存静态资源
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }

    # HTML 文件不缓存，确保更新及时
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma no-cache;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }

    # SPA 路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }

    # API 请求直接由前端处理（连接到 Supabase）
    # 如果需要后端 API 代理，请配置相应的上游服务器

    # 健康检查端点
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' data:;" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # 错误页面
    error_page 404 /404.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF

# 从构建阶段复制静态文件
COPY --from=builder --chown=appuser:appuser /app/dist/ /usr/share/nginx/html/

# 确保 404.html 存在
RUN if [ ! -f /usr/share/nginx/html/404.html ]; then \
        echo '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 - Page Not Found</h1></body></html>' > /usr/share/nginx/html/404.html; \
    fi

# 设置正确的权限
RUN chown -R appuser:appuser /usr/share/nginx/html && \
    chown -R appuser:appuser /var/cache/nginx && \
    chown -R appuser:appuser /var/log/nginx && \
    chown -R appuser:appuser /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R appuser:appuser /var/run/nginx.pid

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["nginx", "-g", "daemon off;"]

# ==========================================
# 元数据标签
# ==========================================
LABEL maintainer="Salary System Team" \
      version="3.0" \
      description="Salary System V3 Frontend - React + Vite + Supabase" \
      org.opencontainers.image.title="salary-system-v3-frontend" \
      org.opencontainers.image.description="Modern salary management system frontend" \
      org.opencontainers.image.version="3.0" \
      org.opencontainers.image.vendor="GaoXiaoCai Corp" \
      org.opencontainers.image.licenses="MIT"