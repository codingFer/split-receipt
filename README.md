# SplitReceipt 🧾✨

SplitReceipt is a modern, responsive web application designed to help friends effortlessly split receipts and shared costs. Using OCR (Optical Character Recognition) technology, it can automatically read receipt items and allow users to assign costs to individuals with a smooth, step-by-step workflow.

## 🚀 Key Features

- **📸 Intelligent OCR**: Scan receipts using your device's camera or upload images. Powered by `tesseract.js` to automatically extract items and prices.
- **👥 Flexible Group Management**: Easily add and manage people participating in the split.
- **⚖️ Precise Item Assignment**: Assign individual items to one or more people, handling complex scenarios (like sharing an appetizer).
- **📋 Step-by-Step Flow**:
    1. **Buyers**: Add the people involved.
    2. **Upload**: Provide the receipt image and parse it.
    3. **Assign**: Match items to their respective buyers.
    4. **Review**: Check the breakdown before finalizing.
    5. **Summary**: A beautiful final summary of who owes what.
- **🎨 Premium UI/UX**: Built with a sleek, dark-themed design using Tailwind CSS 4 and Radix UI components for a premium feel.
- **📱 Mobile First**: Fully responsive design that works perfectly on smartphones for use directly at the restaurant or shop.

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) & [Shadcn/UI](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **OCR**: [Tesseract.js](https://tesseract.projectnaptha.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) / `tw-animate-css`
- **Charts**: [Recharts](https://recharts.org/)

## 📂 Project Structure

```bash
factureDelegate/
├── app/                # Next.js App Router (pages and layouts)
├── components/         # Reusable UI components
│   ├── ui/             # Core UI components (Radix/Shadcn)
│   └── steps/          # Logic for each workflow step
├── hooks/              # Custom React hooks
├── lib/                # Utility functions, types, and state management (Store)
├── public/             # Static assets
└── styles/             # Global CSS and Tailwind configuration
```

## 🚥 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone git@github.com:codingFer/split-receipt.git
   cd split-receipt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details (if applicable).

---

Built with ❤️ by codingfer
