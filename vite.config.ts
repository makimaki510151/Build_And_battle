import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages: https://<user>.github.io/Build_And_battle/
export default defineConfig({
  plugins: [react()],
  base: '/Build_And_battle/',
})
