import React from 'react';

function factorial(n: number): number {
  if (n < 0) throw new Error("Negative input not allowed");
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

interface FactorialDisplayProps {
  number: number;
}

const FactorialDisplay: React.FC<FactorialDisplayProps> = ({ number }) => {
  return (
    <div>
      Factorial of {number} is {factorial(number)}
    </div>
  );
};

export default FactorialDisplay;
