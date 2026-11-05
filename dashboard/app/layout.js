import './globals.css';

export const metadata = {
  title: 'SPDI — Smart Parcel Defect Inspection',
  description: 'Edge AI (CiRA CORE) + IoT parcel defect inspection — digital twin and live dashboard',
};

export const viewport = {
  themeColor: '#080c11',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
