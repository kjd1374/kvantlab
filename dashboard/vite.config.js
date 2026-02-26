import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        port: 6001,
        host: '0.0.0.0',
        open: false,
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url === '/admin') {
                    res.writeHead(301, { Location: '/admin/' });
                    res.end();
                } else {
                    next();
                }
            });
        },
        proxy: {
            '/api/ollama': {
                target: 'http://127.0.0.1:11434',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ollama/, '/api')
            },
            '/api/admin': {
                target: 'http://127.0.0.1:6002',
                changeOrigin: true
            }
        }
    },
    build: {
        rollupOptions: {
            input: {
                main: 'index.html',
                admin: 'admin/index.html'
            }
        }
    }
})
