import React from 'react';
import '../styles/globals.css';
import Link from 'next/link';

const Header = () => {
  return (
    <>
    
    <Link href="/">
    <header className="m-2 p-2">
      <h1 className="blue-gradient font-extrabold m-1 p-2">SmartPick</h1>
    </header>
    </Link>
    
    </>
  );
};
export default Header;