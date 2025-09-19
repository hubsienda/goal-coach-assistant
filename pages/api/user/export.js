// pages/api/user/export.js
import { createClient } from '@supabase/supabase-js';
import PDFDocument from 'pdfkit';
import { Parser } from '@json2csv/plainjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { userId, format = 'pdf', range = 'week' } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify user has premium access
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_status, email')
      .eq('id', userId)
      .single();

    if (userError || user.subscription_status !== 'active') {
      return res.status(403).json({ message: 'Premium subscription required' });
    }

    // Get export data
    const exportData = await getExportData(userId, range);

    if (format === 'pdf') {
      const pdfBuffer = await generatePDF(exportData, user.email, range);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="goalverse-progress-${range}.pdf"`);
      res.send(pdfBuffer);
    } else if (format === 'csv') {
      const csvData = generateCSV(exportData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="goalverse-data-${range}.csv"`);
      res.send(csvData);
    } else {
      return res.status(400).json({ message: 'Invalid format. Use "pdf" or "csv"' });
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Export failed' });
  }
}

async function getExportData(userId, range) {
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (range) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }

  // Get goals
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  // Get conversation logs
  const { data: conversations } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('event_type', 'goal_session')
    .gte('created_at', startDate.toISOString())
    .order('created_at', { ascending: false });

  return {
    goals: goals || [],
    conversations: conversations || [],
    period: range,
    startDate,
    endDate: now,
    summary: {
      totalGoals: goals?.length || 0,
      completedGoals: goals?.filter(g => g.status === 'completed').length || 0,
      totalSessions: conversations?.length || 0,
      completionRate: goals?.length > 0 ? Math.round((goals.filter(g => g.status === 'completed').length / goals.length) * 100) : 0
    }
  };
}

async function generatePDF(data, userEmail, range) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument();
      const chunks = [];
      
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Header
      doc.fillColor('#00CFFF')
         .fontSize(24)
         .font('Helvetica-Bold')
         .text('GOALVERSE', 50, 50);
      
      doc.fillColor('#000000')
         .fontSize(16)
         .font('Helvetica')
         .text('Progress Report', 50, 85);

      doc.fontSize(12)
         .text(`User: ${userEmail}`, 50, 110)
         .text(`Period: ${range.charAt(0).toUpperCase() + range.slice(1)}`, 50, 125)
         .text(`Generated: ${new Date().toLocaleDateString()}`, 50, 140);

      // Summary Section
      doc.moveDown(2)
         .fillColor('#FFD60A')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Summary', 50, doc.y);

      doc.fillColor('#000000')
         .fontSize(12)
         .font('Helvetica')
         .text(`Total Goals: ${data.summary.totalGoals}`, 70, doc.y + 15)
         .text(`Completed Goals: ${data.summary.completedGoals}`, 70, doc.y + 10)
         .text(`Completion Rate: ${data.summary.completionRate}%`, 70, doc.y + 10)
         .text(`Coaching Sessions: ${data.summary.totalSessions}`, 70, doc.y + 10);

      // Goals Section
      if (data.goals.length > 0) {
        doc.moveDown(2)
           .fillColor('#00CFFF')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('Goals', 50, doc.y);

        data.goals.forEach((goal, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          const status = goal.status === 'completed' ? '✓' : '○';
          const statusColor = goal.status === 'completed' ? '#10B981' : '#6B7280';

          doc.fillColor(statusColor)
             .fontSize(12)
             .font('Helvetica-Bold')
             .text(`${index + 1}. ${status} ${goal.title}`, 70, doc.y + 20);

          if (goal.description) {
            doc.fillColor('#000000')
               .font('Helvetica')
               .fontSize(10)
               .text(goal.description, 90, doc.y + 10, { width: 400 });
          }

          doc.fillColor('#6B7280')
             .fontSize(9)
             .text(`Created: ${new Date(goal.created_at).toLocaleDateString()}`, 90, doc.y + 10);
        });
      }

      // Recent Sessions Section
      if (data.conversations.length > 0) {
        doc.moveDown(2)
           .fillColor('#00CFFF')
           .fontSize(16)
           .font('Helvetica-Bold')
           .text('Recent Coaching Sessions', 50, doc.y);

        data.conversations.slice(0, 5).forEach((session, index) => {
          if (doc.y > 650) {
            doc.addPage();
          }

          doc.fillColor('#000000')
             .fontSize(11)
             .font('Helvetica-Bold')
             .text(`Session ${index + 1}`, 70, doc.y + 20);

          doc.fontSize(10)
             .font('Helvetica')
             .text(`Date: ${new Date(session.created_at).toLocaleDateString()}`, 70, doc.y + 10);

          if (session.metadata?.session_summary) {
            doc.text(`Summary: ${session.metadata.session_summary}`, 70, doc.y + 10, { width: 450 });
          }
        });
      }

      // Footer
      doc.fontSize(8)
         .fillColor('#6B7280')
         .text('Generated by GOALVERSE - Because progress needs direction', 50, doc.page.height - 50);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

function generateCSV(data) {
  const csvData = [];

  // Add goals data
  data.goals.forEach(goal => {
    csvData.push({
      type: 'goal',
      title: goal.title,
      description: goal.description || '',
      status: goal.status,
      created_at: goal.created_at,
      updated_at: goal.updated_at
    });
  });

  // Add session data
  data.conversations.forEach(session => {
    csvData.push({
      type: 'session',
      title: 'Coaching Session',
      description: session.metadata?.session_summary || '',
      status: 'completed',
      created_at: session.created_at,
      updated_at: session.created_at
    });
  });

  const fields = ['type', 'title', 'description', 'status', 'created_at', 'updated_at'];
  const parser = new Parser({ fields });
  
  return parser.parse(csvData);
}
