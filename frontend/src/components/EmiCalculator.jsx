import { useState } from 'react';
import { money } from './VehicleCard.jsx';

function calculateEMI(loanAmount, interestRate, loanYears) {
  if (loanAmount <= 0 || interestRate <= 0 || loanYears <= 0) {
    return 0;
  }

  const monthlyRate = interestRate / 12 / 100;
  const months = loanYears * 12;

  const emi =
    (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  return Math.round(emi);
}

// Simple EMI estimate for one vehicle price. No external API.
function EmiCalculator({ vehiclePrice }) {
  const price = Number(vehiclePrice) || 0;
  const defaultDown = Math.round(price * 0.2);

  const [downPayment, setDownPayment] = useState(defaultDown);
  const [interestRate, setInterestRate] = useState(9);
  const [loanYears, setLoanYears] = useState(5);

  const loanAmount = Math.max(price - Number(downPayment || 0), 0);
  const emi = calculateEMI(loanAmount, Number(interestRate), Number(loanYears));

  return (
    <div className="rounded-2xl border border-ink/10 bg-white/60 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-coral">
        EMI estimate
      </p>
      <p className="mt-1 text-sm text-ink/55">
        Vehicle price: {money(price)}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink/55">Down payment</span>
          <input
            type="number"
            min="0"
            value={downPayment}
            onChange={(event) => setDownPayment(Number(event.target.value))}
            className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-pine"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-ink/55">Interest %</span>
          <input
            type="number"
            min="1"
            step="0.1"
            value={interestRate}
            onChange={(event) => setInterestRate(Number(event.target.value))}
            className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-pine"
          />
        </label>

        <label className="text-sm">
          <span className="mb-1 block text-ink/55">Years</span>
          <input
            type="number"
            min="1"
            max="10"
            value={loanYears}
            onChange={(event) => setLoanYears(Number(event.target.value))}
            className="w-full rounded-xl border border-ink/15 bg-white px-3 py-2 outline-none focus:border-pine"
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-ink/55">
        Loan amount: {money(loanAmount)}
      </p>
      <p className="mt-2 text-xl font-bold text-pine">
        Estimated EMI: {money(emi)} / month
      </p>
    </div>
  );
}

export default EmiCalculator;
export { calculateEMI };
