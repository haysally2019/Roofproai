import { supabase } from './supabase';

export interface CreateInvoiceFromContractParams {
  contractId: string;
  companyId: string;
  leadId: string;
  leadName: string;
  description: string;
  amount: number;
  dueInDays?: number;
}

export interface CreateLaborOrderParams {
  contractId: string;
  companyId: string;
  leadId: string;
  leadName: string;
  workType: 'Tear-off' | 'Installation' | 'Repair' | 'Inspection';
  scheduledDate: string;
  estimatedHours: number;
  crewMemberIds: string[];
  notes?: string;
}

export const createInvoiceFromContract = async (params: CreateInvoiceFromContractParams) => {
  const {
    contractId,
    companyId,
    leadId,
    leadName,
    description,
    amount,
    dueInDays = 14
  } = params;

  const subtotal = amount;
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueInDays);

  try {
    const timestamp = Date.now();
    const { data, error } = await supabase
      .from('invoices')
      .insert([{
        company_id: companyId,
        lead_id: leadId,
        lead_name: leadName,
        contract_id: contractId,
        number: `INV-${timestamp.toString().slice(-6)}`,
        status: 'Draft',
        date_issued: new Date().toISOString().split('T')[0],
        date_due: dueDate.toISOString().split('T')[0],
        items: [{
          id: '1',
          description,
          quantity: 1,
          unitPrice: amount,
          total: amount
        }],
        subtotal,
        tax,
        total,
        amount_paid: 0,
        payment_link: `https://pay.rafterai.com/i/${timestamp}`
      }])
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error creating invoice from contract:', error);
    return { success: false, error };
  }
};

export const createLaborOrderFromContract = async (params: CreateLaborOrderParams) => {
  const {
    contractId,
    companyId,
    leadId,
    leadName,
    workType,
    scheduledDate,
    estimatedHours,
    crewMemberIds,
    notes
  } = params;

  try {
    const timestamp = Date.now();
    const { data: order, error: orderError } = await supabase
      .from('labor_orders')
      .insert([{
        company_id: companyId,
        contract_id: contractId,
        lead_id: leadId,
        lead_name: leadName,
        work_order_number: `WO-${timestamp.toString().slice(-6)}`,
        work_type: workType,
        status: 'Scheduled',
        scheduled_date: scheduledDate,
        estimated_hours: estimatedHours,
        total_cost: 0,
        notes: notes || ''
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    if (crewMemberIds.length > 0) {
      const crewInserts = crewMemberIds.map(crewId => ({
        labor_order_id: order.id,
        crew_member_id: crewId,
        hours_worked: 0,
        labor_cost: 0
      }));

      const { error: crewError } = await supabase
        .from('labor_order_crew')
        .insert(crewInserts);

      if (crewError) throw crewError;
    }

    return { success: true, data: order };
  } catch (error) {
    console.error('Error creating labor order from contract:', error);
    return { success: false, error };
  }
};

export const createDepositInvoiceFromContract = async (
  contractId: string,
  companyId: string,
  leadId: string,
  leadName: string,
  depositAmount: number
) => {
  return createInvoiceFromContract({
    contractId,
    companyId,
    leadId,
    leadName,
    description: 'Contract Deposit',
    amount: depositAmount,
    dueInDays: 7
  });
};

export const createMilestoneInvoicesFromContract = async (
  contractId: string,
  companyId: string,
  leadId: string,
  leadName: string,
  paymentSchedule: Array<{ milestone: string; amount: number; dueInDays?: number }>
) => {
  const results = [];

  for (const payment of paymentSchedule) {
    const result = await createInvoiceFromContract({
      contractId,
      companyId,
      leadId,
      leadName,
      description: payment.milestone,
      amount: payment.amount,
      dueInDays: payment.dueInDays || 14
    });

    results.push(result);

    if (!result.success) {
      console.error(`Failed to create invoice for milestone: ${payment.milestone}`);
      break;
    }
  }

  return results;
};

export const getContractInvoices = async (contractId: string) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('contract_id', contractId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching contract invoices:', error);
    return { success: false, error, data: [] };
  }
};

export const getContractLaborOrders = async (contractId: string) => {
  try {
    const { data, error } = await supabase
      .from('labor_orders')
      .select('*')
      .eq('contract_id', contractId)
      .order('scheduled_date', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching contract labor orders:', error);
    return { success: false, error, data: [] };
  }
};

export const getContractFinancialSummary = async (contractId: string) => {
  try {
    const invoicesResult = await getContractInvoices(contractId);
    const laborResult = await getContractLaborOrders(contractId);

    if (!invoicesResult.success || !laborResult.success) {
      throw new Error('Failed to fetch contract data');
    }

    const invoices = invoicesResult.data || [];
    const laborOrders = laborResult.data || [];

    const totalInvoiced = invoices.reduce((sum, inv: any) => sum + (inv.total || 0), 0);
    const totalPaid = invoices.reduce((sum, inv: any) => sum + (inv.amount_paid || 0), 0);
    const totalOutstanding = totalInvoiced - totalPaid;
    const totalLaborCost = laborOrders.reduce((sum, order: any) => sum + (order.total_cost || 0), 0);

    return {
      success: true,
      data: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        totalLaborCost,
        invoiceCount: invoices.length,
        laborOrderCount: laborOrders.length
      }
    };
  } catch (error) {
    console.error('Error calculating contract financial summary:', error);
    return { success: false, error };
  }
};
