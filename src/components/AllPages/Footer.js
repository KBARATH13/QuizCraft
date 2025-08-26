import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>&copy; {new Date().getFullYear()} QuizCraft. All rights reserved.</p>
        <p>Designed with &#x2764; and  support by techies</p>
      </div>
    </footer>
  );
}
