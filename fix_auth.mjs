import fs from 'fs';
import path from 'path';

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let newContent = content;
  for (const rep of replacements) {
    if (typeof rep.from === 'string') {
      newContent = newContent.split(rep.from).join(rep.to);
    } else {
      newContent = newContent.replace(rep.from, rep.to);
    }
  }
  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent);
    console.log(`Updated ${filePath}`);
  }
}

// 1. Fix incorrect authOptions imports and getServerSession calls
const apiDir = path.join(process.cwd(), 'app', 'api');
if (fs.existsSync(apiDir)) {
  walk(apiDir, (filePath) => {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      replaceInFile(filePath, [
        {
          from: "import { authOptions } from '@/app/api/auth/[...nextauth]/route';",
          to: "import { authOptions } from '@/lib/auth';"
        },
        {
          from: "const session = await getServerSession() as any;",
          to: "const session = await getServerSession(authOptions) as any;"
        },
        {
          from: "import { getServerSession } from 'next-auth';",
          to: "import { getServerSession } from 'next-auth/next';\nimport { authOptions } from '@/lib/auth';"
        }
      ]);
    }
  });
}

// 2. Fix middleware.ts student API protection
const middlewarePath = path.join(process.cwd(), 'middleware.ts');
if (fs.existsSync(middlewarePath)) {
  let mwContent = fs.readFileSync(middlewarePath, 'utf-8');
  if (!mwContent.includes('/api/student")')) {
    const injection = `
    // Protect Student API routes
    if (path.startsWith("/api/student") && token?.role !== "STUDENT" && token?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Students only" }, { status: 403 });
    }
`;
    mwContent = mwContent.replace('return NextResponse.next();', injection + '\n    return NextResponse.next();');
    fs.writeFileSync(middlewarePath, mwContent);
    console.log('Updated middleware.ts');
  }
}
