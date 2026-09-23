const http = require('http');
const { ADMIN_TOKEN, generateStudentToken } = require('../middlewares/authMiddleware');
const { dbGet } = require('../database');

// Wait 1 sec for server or test against running server, or import express app
const express = require('express');
const cors = require('cors');
const studentRoutes = require('../routes/studentRoutes');
const adminRoutes = require('../routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/admin', adminRoutes);
app.use('/students', studentRoutes);

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    // 1. Fetch admin bills
    const resBills = await fetch(`http://127.0.0.1:${port}/admin/bills`, {
      headers: { 'Authorization': `Bearer ${ADMIN_TOKEN}` }
    });
    const billsData = await resBills.json();
    console.log('Admin Bills count:', billsData.count, 'Stats:', billsData.stats);
    if (!billsData.success || billsData.count === 0) {
      throw new Error('Failed to fetch admin bills or no bills found.');
    }

    const testBill = billsData.data[0];
    console.log('Testing with Bill ID:', testBill.id, 'Gross:', testBill.gross_amount);

    // 2. Apply 40% discount
    const resDiscount = await fetch(`http://127.0.0.1:${port}/admin/bills/${testBill.id}/discount`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ discount_percentage: 40 })
    });
    const discData = await resDiscount.json();
    console.log('Discount result:', discData.message, 'Net:', discData.data.net_amount);
    if (discData.data.discount_percentage !== 40) {
      throw new Error('Discount percentage was not 40%');
    }

    // 3. Mark as Paid
    const resStatus = await fetch(`http://127.0.0.1:${port}/admin/bills/${testBill.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      body: JSON.stringify({ payment_status: 'Paid' })
    });
    const statData = await resStatus.json();
    console.log('Status result:', statData.message, 'Paid At:', statData.data.paid_at);
    if (statData.data.payment_status !== 'Paid') {
      throw new Error('Payment status was not Paid');
    }

    // 4. Test student endpoint GET /students/me/bills
    const student = await dbGet('SELECT * FROM students WHERE id = ?', [testBill.student_id]);
    const studentToken = generateStudentToken(student);

    const resStuBills = await fetch(`http://127.0.0.1:${port}/students/me/bills`, {
      headers: { 'Authorization': `Bearer ${studentToken}` }
    });
    const stuBillsData = await resStuBills.json();
    console.log('Student bills fetched for', stuBillsData.student.registration_id, ':', stuBillsData.bills.length);
    const stuBill = stuBillsData.bills.find(b => b.id === testBill.id);
    if (!stuBill) throw new Error('Student bill not found in /students/me/bills');
    console.log('Verified Student Bill:', {
      total_credits: stuBill.total_credits,
      rate_per_credit: stuBill.rate_per_credit,
      gross_amount: stuBill.gross_amount,
      discount_percentage: stuBill.discount_percentage,
      net_amount: stuBill.net_amount,
      payment_status: stuBill.payment_status,
      courses_count: stuBill.courses.length
    });

    if (stuBill.payment_status !== 'Paid') throw new Error('Student bill status should be Paid');
    if (stuBill.discount_percentage !== 40) throw new Error('Student bill discount should be 40%');

    console.log('\n========================================');
    console.log(' ALL BILLING BACKEND TESTS PASSED 100%! ');
    console.log('========================================\n');

  } catch (err) {
    console.error('Test error:', err);
    process.exitCode = 1;
    server.close(() => process.exit(1));
  } finally {
    if (!process.exitCode) {
      server.close(() => process.exit(0));
    }
  }
});
