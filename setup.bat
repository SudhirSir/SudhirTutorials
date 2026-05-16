@echo off
echo Starting setup...
call npm install next react react-dom
call npm install -D typescript @types/node @types/react @types/react-dom eslint eslint-config-next prisma @prisma/client next-auth
call npx prisma init
echo Done > setup_done.txt
