import React, { useState, useMemo } from 'react';
import { Invoice, ShopSettings, Expense, DailyReport } from '../types';
import { Plus, Trash2, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { downloadBlobFile } from '../services/excelService';

interface DailyJournalScreenProps {
  invoices: Invoice[];
  expenses: Expense[];
  dailyReports: DailyReport[];
  settings: ShopSettings;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
  onAddDailyReport: (report: Omit<DailyReport, 'id'>) => void;
}

export const DailyJournalScreen: React.FC<DailyJournalScreenProps> = ({
  invoices,
  expenses,
  dailyReports,
  settings,
  onAddExpense,
  onDeleteExpense,
  onAddDailyReport,
}) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('مصاريف عامة');
  
  const [startingCapital, setStartingCapital] = useState('');

  // Daily stats for SELECTED date
  const selectedDateStats = useMemo(() => {
    const cashRevenue = invoices
      .filter((inv) => inv.date === selectedDate && inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
    const debtRevenue = invoices
      .filter((inv) => inv.date === selectedDate && inv.status === 'pending')
      .reduce((sum, inv) => sum + inv.total, 0);
    const exp = expenses
      .filter((ex) => ex.date === selectedDate)
      .reduce((sum, ex) => sum + ex.amount, 0);
    return { cashRevenue, debtRevenue, exp, date: selectedDate };
  }, [invoices, expenses, selectedDate]);

  const handleSubmitExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    onAddExpense({
      date,
      amount: parseFloat(amount),
      description,
      category,
    });
    setDescription('');
    setAmount('');
  };

  const handleCloseDay = () => {
    if (!startingCapital) return alert('يرجى إدخال رأس مال بداية اليوم');
    
    onAddDailyReport({
      date: selectedDateStats.date,
      startingCapital: parseFloat(startingCapital),
      cashRevenue: selectedDateStats.cashRevenue,
      debtRevenue: selectedDateStats.debtRevenue,
      totalExpenses: selectedDateStats.exp,
      netProfit: selectedDateStats.cashRevenue - selectedDateStats.exp, // Cash profit logic
    });
    setStartingCapital('');
    alert('تم حفظ تقرير اليوم بنجاح');
  };

  const exportReportsToExcel = () => {
    const reportData = dailyReports.map((rep, idx) => ({
        'م': idx + 1,
        'التاريخ': rep.date,
        'رأس مال بداية اليوم': rep.startingCapital.toFixed(3),
        'إيرادات نقدية': rep.cashRevenue.toFixed(3),
        'إيرادات ذمم': rep.debtRevenue.toFixed(3),
        'إجمالي المصاريف': rep.totalExpenses.toFixed(3),
        'صافي الربح النقد': rep.netProfit.toFixed(3),
    }));

    const expenseData = expenses.map((exp, idx) => ({
        'م': idx + 1,
        'التاريخ': exp.date,
        'الوصف': exp.description,
        'التصنيف': exp.category,
        'المبلغ': exp.amount.toFixed(3),
    }));

    const wb = XLSX.utils.book_new();
    
    const wsReports = XLSX.utils.json_to_sheet(reportData);
    wsReports['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsReports, 'التقارير اليومية');

    const wsExpenses = XLSX.utils.json_to_sheet(expenseData);
    wsExpenses['!cols'] = [
        { wch: 6 },
        { wch: 12 },
        { wch: 30 },
        { wch: 20 },
        { wch: 15 },
    ];
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'دفتر اليومية - المصاريف');
    
    const filename = `تقرير_اليومية_${selectedDate}.xlsx`;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlobFile(wbout, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-200">
      <h1 className="text-xl font-black text-[#1A1A1A]">دفتر اليومية وإغلاق اليوم</h1>

      {/* Daily Closing Section */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center">
            <h2 className="font-bold text-sm text-[#087A35]">إغلاق اليومية</h2>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 text-xs font-bold" />
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
                <label className="text-[10px] font-bold text-gray-500">رأس المال</label>
                <input type="number" value={startingCapital} onChange={(e) => setStartingCapital(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm" />
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-500">إيرادات نقدية</label>
                <div className="text-sm font-black text-[#087A35]">{selectedDateStats.cashRevenue.toFixed(3)} {settings.currency}</div>
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-500">إيرادات ذمم</label>
                <div className="text-sm font-black text-amber-600">{selectedDateStats.debtRevenue.toFixed(3)} {settings.currency}</div>
            </div>
            <div>
                <label className="text-[10px] font-bold text-gray-500">المصاريف</label>
                <div className="text-sm font-black text-red-600">{selectedDateStats.exp.toFixed(3)} {settings.currency}</div>
            </div>
        </div>
        <button onClick={handleCloseDay} className="w-full py-2 bg-[#1A1A1A] text-white rounded-xl font-bold text-sm">حفظ تقرير اليوم: {selectedDate}</button>
      </div>

      {/* Expenses Form */}
      <form onSubmit={handleSubmitExpense} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs space-y-3">
        <h2 className="font-bold text-sm">إضافة مصروف جديد</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input type="text" placeholder="وصف المصروف" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm" />
          <input type="number" placeholder="المبلغ" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm" />
          <input type="text" placeholder="التصنيف" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm" />
        </div>
        <button type="submit" className="w-full py-2 bg-[#087A35] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
          <Plus className="w-4 h-4" /> إضافة مصروف
        </button>
      </form>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-sm">سجل المصاريف</div>
        {expenses.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">لا توجد مصاريف مسجلة</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm">{exp.description}</div>
                  <div className="text-xs text-gray-400">{exp.date} • {exp.category}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-bold text-red-600">{exp.amount.toFixed(3)} {settings.currency}</div>
                  <button onClick={() => onDeleteExpense(exp.id)} className="text-gray-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Daily Reports List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 font-bold text-sm flex justify-between items-center">
            <span>أرشيف تقارير اليومية</span>
            <button onClick={exportReportsToExcel} className="text-[#087A35] flex items-center gap-1 text-xs font-bold">
                <Download className="w-4 h-4" /> تصدير للإكسل
            </button>
        </div>
        {dailyReports.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">لا توجد تقارير محفوظة</div>
        ) : (
            <div className="divide-y divide-gray-100">
                {dailyReports.map(rep => (
                    <div key={rep.id} className="p-4 flex items-center justify-between text-xs">
                        <div className="font-bold text-sm">{rep.date}</div>
                        <div className="text-gray-500">رأس المال: {rep.startingCapital.toFixed(3)}</div>
                        <div className="font-bold text-blue-700">صافي الربح: {rep.netProfit.toFixed(3)}</div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
