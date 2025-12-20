import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransactionResponse } from '../../models/FinancialMovement';

interface CategorySummary {
  name: string;
  totalAmount: number;
  count: number;
}

interface SortConfig {
  field: 'date' | 'amount' | 'type';
  order: 'asc' | 'desc';
}

interface DateSummary {
  date: string;
  totalAmount: number;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  generateTransactionsPdf(transactions: TransactionResponse[], sortConfig?: SortConfig): void {
    let sortedTransactions = [...transactions];
    if (sortConfig) {
      sortedTransactions.sort((a, b) => {
        let comparison = 0;
        switch (sortConfig.field) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'amount':
            comparison = b.amount - a.amount;
            break;
          case 'type':

            comparison = a.movementName === b.movementName ? 0 :
              a.movementName === 'INCOME' ? -1 : 1;
            break;
          default:
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
        }
        return sortConfig.order === 'asc' ? comparison : -comparison;
      });
    } else {
      sortedTransactions.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    }

    const doc = new jsPDF();
    this.addHeader(doc);
    this.addSummaryStatistics(doc, sortedTransactions);
    this.addTransactionsTable(doc, sortedTransactions);
    doc.save('financial_report.pdf');
  }
  private addHeader(doc: jsPDF): void {
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(0, 102, 102); // Teal color
    doc.text('Financial Transactions Report', 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100); // Gray color
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated on: ${today}`, 14, 30);

    // Add horizontal line
    doc.setDrawColor(220, 220, 220); // Light gray
    doc.line(14, 35, 196, 35);
  }

  private addSummaryStatistics(doc: jsPDF, transactions: TransactionResponse[]): void {
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Summary', 14, 45);

    const totalTransactions = transactions.length;

    const incomeTransactions = transactions.filter(t => t.movementName === 'INCOME');
    const expenseTransactions = transactions.filter(t => t.movementName === 'OUTCOME');

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

    autoTable(doc, {
      startY: 50,
      head: [['Metric', 'Value']],
      body: [
        ['Total Transactions', totalTransactions.toString()],
        ['Total Income', `$${totalIncome.toFixed(2)}`],
        ['Total Expenses', `$${totalExpense.toFixed(2)}`],
        ['Balance', `$${balance.toFixed(2)}`]
      ],
      theme: 'grid',
      headStyles: {
        fillColor: [0, 102, 102],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 10
      },
      columnStyles: {
        0: { fontStyle: 'bold' }
      }
    });
  }

  private addTransactionsTable(doc: jsPDF, transactions: TransactionResponse[]): void {
    // Add section title
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    const startY = (doc as any).lastAutoTable?.finalY || 300;
    doc.text('Transactions', 14, startY + 10);

    // Format transactions for the table
    const tableData = transactions.map(tx => {
      const date = new Date(tx.date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });

      return [
        date,
        tx.categoryName,
        tx.movementName === 'INCOME' ? 'Income' : 'Outcome',
        tx.currencyName,
        `$${tx.amount.toFixed(2)}`
      ];
    });

    // Create table
    autoTable(doc, {
      startY: startY + 15,
      head: [['Date', 'Category', 'Type', 'Currency', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 102, 102],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 9
      },
      columnStyles: {
        4: { halign: 'right' }
      }
    });
  }
}
