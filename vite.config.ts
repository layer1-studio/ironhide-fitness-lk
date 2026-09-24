import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function cybersourcePostRedirect(): Plugin {
  const interceptedPaths = ['/payments', '/renew', '/verify-email']
  return {
    name: 'cybersource-post-redirect',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
          
        if (req.method === 'POST' && interceptedPaths.some((p) => req.url?.startsWith(p))) {
          res.writeHead(302, { Location: req.url })
          res.end()
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cybersourcePostRedirect()],
  base: process.env.DEPLOY_TARGET === 'gh-pages' ? '/ironhide-fitness-lk/' : '/',
})
