import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="header">
          <a className="logo" href="/">ARAMalyzer</a>
          <div className="header-right">
            <a className="github" href="https://github.com/alexahn1929/aram-analyzer">View Project on GitHub</a>
          </div>
        </div>
        {children}
      </body>
    </html>
  )
}

/*
<ul>
  <li>
    <a href="https://github.com/alexahn1929/aram-analyzer">View Project on GitHub</a>
  </li>
</ul>
*/