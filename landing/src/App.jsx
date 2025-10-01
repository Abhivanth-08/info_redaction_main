import React from "react";

const HUGGINGFACE_URL = import.meta.env.FRONTEND_URL || "https://0207abhi-info-redaction.hf.space/";

function App() {
  const handleTryNow = () => {
    window.open(HUGGINGFACE_URL, "_blank");
  };

  return (
    <div className="font-sans text-white bg-gradient-to-r from-[#0f172a] to-[#047857] scroll-smooth">
      <header className="flex justify-between items-center p-6 bg-black bg-opacity-50 fixed w-full top-0 z-50">
        <h1 className="text-2xl font-bold">Info Redaction</h1>
        <nav>
          <a href="#about" className="px-4 hover:text-[#34d399]">About</a>
          <a href="#creators" className="px-4 hover:text-[#34d399]">Creators</a>
          <a href="#demo" className="px-4 hover:text-[#34d399]">Demo</a>
        </nav>
      </header>

      <section className="h-screen flex flex-col justify-center items-center text-center px-4">
        <h2 className="text-5xl font-bold mb-4">Protect Sensitive Information</h2>
        <p className="text-lg mb-6 max-w-2xl">
          Our Info Redaction system ensures privacy by automatically detecting and removing sensitive details from text.
        </p>
        <button
          onClick={handleTryNow}
          className="bg-[#047857] hover:bg-[#065f46] px-8 py-3 rounded-full text-lg font-semibold shadow-lg transition"
        >
          Try Now 🚀
        </button>
      </section>

      <section id="about" className="py-16 px-8 bg-gradient-to-r from-[#0f172a] to-[#1e3a8a]">
        <h3 className="text-3xl font-bold mb-6 text-center">About the Project</h3>
        <p className="max-w-3xl mx-auto text-lg leading-relaxed">
          The Info Redaction Web app is designed to provide a secure way of sharing and processing data 
          by automatically identifying and masking personal or sensitive information. 
          Built using Machine Learning models, it helps safeguard privacy in real-time.
        </p>
      </section>

      <section id="creators" className="py-16 px-8 bg-gradient-to-r from-[#047857] to-[#065f46]">
        <h3 className="text-3xl font-bold mb-6 text-center">Meet the Creators</h3>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {["Abhivanth", "Sivakarthick", "Dhamodharan", "Naveen Prasath"].map(name => (
            <div key={name} className="p-6 bg-black bg-opacity-40 rounded-lg shadow-lg text-center">
              <h4 className="text-xl font-semibold">{name}</h4>
            </div>
          ))}
        </div>
      </section>

      <section className="demo-section text-center py-16">
        <h2 className="text-3xl font-bold mb-4">Watch Our Demo</h2>
        <p className="mb-6">See how Info Redaction works in action.</p>
        <a
          href="https://youtu.be/oMhY89Tx6J0"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition"
        >
          Watch Demo 🎬
        </a>
      </section>


      <footer className="text-center py-6 bg-black bg-opacity-70">
        <p>&copy; 2025 Info Redaction</p>
      </footer>
    </div>
  );
}

export default App;
