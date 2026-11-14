import React, { useState, useMemo, useCallback } from 'react';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { AllChitsView } from './components/chits/AllChitsView';
import { ChitDetailWorkspace } from './components/chits/ChitDetailWorkspace';
import { CreateChitWizardModal } from './components/chits/CreateChitWizardModal';
import { AddMemberModal } from './components/members/AddMemberModal';
import { CsvImportModal } from './components/members/CsvImportModal';
import { MemberProfileModal } from './components/members/MemberProfileModal';
import { MemberLedgerModal } from './components/chits/MemberLedgerModal';
import { AssignMemberModal } from './components/chits/AssignMemberModal';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';
import { ReceiptModal } from './components/payments/ReceiptModal';
import { ReversalModal } from './components/payments/ReversalModal';
import { CollectionsView } from './components/payments/CollectionsView';
import { MasterLedgerView } from './components/ledger/MasterLedgerView';
import { CashbookView } from './components/cashbook/CashbookView';
import { AddCashbookEntryModal } from './components/cashbook/AddCashbookEntryModal';
import { RemindersView } from './components/reminders/RemindersView';
import { NotificationDrawer } from './components/reminders/NotificationDrawer';
import { SettingsView } from './components/settings/SettingsView';
import { SupabaseConnectModal } from './components/settings/SupabaseConnectModal';
import { storageService } from './services/storage';
import { isSupabaseConfigured } from './services/supabase';
import {
  ChitScheme,
  CompanyMember,
  ChitMembership,
  FinancialTransaction,
  UserProfile,
  CompanyProfile,
  AuditLog,
  NotificationItem,
  PendingChitMember,
} from './types';

export function App() {
  // Navigation & View state
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedChitId, setSelectedChitId] = useState<string | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Core Data State from Storage Engine (Empty initial state)
  const [company, setCompany] = useState<CompanyProfile>(() => storageService.getCompanyProfile());
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => storageService.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(() => storageService.getAllUsers());
  const [schemes, setSchemes] = useState<ChitScheme[]>(() => storageService.getSchemes());
  const [members, setMembers] = useState<CompanyMember[]>(() => storageService.getMembers());
  const [memberships, setMemberships] = useState<ChitMembership[]>(() => storageService.getMemberships());
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(() => storageService.getTransactions());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => storageService.getAuditLogs());
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => storageService.getNotifications());
  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => storageService.isDemoMode());

  // Modal states
  const [isCreateChitOpen, setIsCreateChitOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentPreselectedChit, setPaymentPreselectedChit] = useState<string | undefined>();
  const [paymentPreselectedMember, setPaymentPreselectedMember] = useState<string | undefined>();
  const [activeEditingTx, setActiveEditingTx] = useState<FinancialTransaction | null>(null);

  const [activeReceiptTx, setActiveReceiptTx] = useState<FinancialTransaction | null>(null);
  const [reversalTargetTx, setReversalTargetTx] = useState<FinancialTransaction | null>(null);
  const [activeProfileMember, setActiveProfileMember] = useState<CompanyMember | null>(null);
  const [activeLedgerTarget, setActiveLedgerTarget] = useState<{ chitId: string; memberId: string } | null>(null);
  const [assignMemberChitId, setAssignMemberChitId] = useState<string | null>(null);
  const [isAddCashbookEntryOpen, setIsAddCashbookEntryOpen] = useState(false);
  const [cashbookTargetChitId, setCashbookTargetChitId] = useState<string | undefined>();
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Sync refresh helper
  const reloadData = useCallback(() => {
    setCompany(storageService.getCompanyProfile());
    setCurrentUser(storageService.getCurrentUser());
    setAllUsers(storageService.getAllUsers());
    setSchemes(storageService.getSchemes());
    setMembers(storageService.getMembers());
    setMemberships(storageService.getMemberships());
    setTransactions(storageService.getTransactions());
    setAuditLogs(storageService.getAuditLogs());
    setNotifications(storageService.getNotifications());
    setIsDemoMode(storageService.isDemoMode());
  }, []);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Create Chit with Enrolled Members
  const handleSaveChitWithMembers = (
    schemeData: Omit<ChitScheme, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
    pendingMembers: PendingChitMember[]
  ): ChitScheme => {
    const newScheme = storageService.createChitWithMembers(schemeData, pendingMembers);
    reloadData();
    return newScheme;
  };

  const handleAddMember = (data: Omit<CompanyMember, 'id' | 'company_id' | 'phone_normalized' | 'created_at' | 'updated_at'>) => {
    storageService.addMember(data);
    reloadData();
  };

  const handleCsvImport = (importedList: Array<Omit<CompanyMember, 'id' | 'company_id' | 'phone_normalized' | 'created_at' | 'updated_at'>>) => {
    importedList.forEach((m) => {
      try {
        storageService.addMember(m);
      } catch (e) {
        // Skip duplicate
      }
    });
    reloadData();
  };

  const handleUpdateMember = (id: string, updated: Partial<CompanyMember>) => {
    storageService.updateMember(id, updated);
    reloadData();
  };

  const handleAssignSeat = (memberId: string, seatNumber: number, contribution: number) => {
    if (assignMemberChitId) {
      storageService.assignMemberToScheme(assignMemberChitId, memberId, seatNumber, contribution);
      reloadData();
      setAssignMemberChitId(null);
    }
  };

  const handleRemoveMemberSeat = (membershipId: string, reason: string) => {
    storageService.removeMemberFromScheme(membershipId, reason);
    reloadData();
  };

  // Payment Recording & Reversal Handlers
  const handleRecordPayment = (params: {
    chit_id: string;
    member_id: string;
    amount: number;
    payment_method: any;
    bank_account?: any;
    installment_no?: number;
    reference_id?: string;
    collector_notes?: string;
    transaction_date?: string;
  }) => {
    const newTx = storageService.recordPayment(params);
    reloadData();
    setActiveReceiptTx(newTx); // Automatically display confirmation receipt
    return newTx;
  };

  const handleUpdatePayment = (
    txId: string,
    params: {
      amount: number;
      payment_method: any;
      bank_account?: any;
      installment_no?: number;
      reference_id?: string;
      collector_notes?: string;
      transaction_date?: string;
    }
  ) => {
    const updatedTx = storageService.updatePayment(txId, params);
    reloadData();
    setActiveReceiptTx(updatedTx);
    return updatedTx;
  };

  const handleRecordCustomCashbookEntry = (entry: any) => {
    storageService.recordCustomEntry(entry);
    reloadData();
  };

  const handleConfirmReversal = (txId: string, reason: string) => {
    storageService.reverseTransaction(txId, reason);
    reloadData();
  };

  // Clear All Database Data
  const handleClearAllData = () => {
    if (window.confirm('Clear all stored schemes, members, and cashbook records to start with a clean empty database?')) {
      storageService.clearAllData();
      setSelectedChitId(null);
      reloadData();
    }
  };

  // Export JSON Database
  const handleExportBackup = () => {
    const json = storageService.exportDatabaseJSON();
    const encoded = encodeURI('data:application/json;charset=utf-8,' + json);
    const link = document.createElement('a');
    link.setAttribute('href', encoded);
    link.setAttribute('download', `chitflow_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Selected chit instance
  const activeChitInstance = useMemo(() => {
    return selectedChitId ? schemes.find((s) => s.id === selectedChitId) || null : null;
  }, [selectedChitId, schemes]);

  // Active Ledger instance
  const activeLedgerData = useMemo(() => {
    if (!activeLedgerTarget) return null;
    const chit = schemes.find((s) => s.id === activeLedgerTarget.chitId);
    const member = members.find((m) => m.id === activeLedgerTarget.memberId);
    const membership = memberships.find(
      (m) => m.chit_id === activeLedgerTarget.chitId && m.member_id === activeLedgerTarget.memberId
    );
    if (!chit || !member || !membership) return null;
    return { chit, member, membership };
  }, [activeLedgerTarget, schemes, members, memberships]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col font-sans text-[#111111]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={selectedChitId ? 'chits' : currentTab}
        onSelectTab={(tab) => {
          setSelectedChitId(null);
          setCurrentTab(tab);
        }}
        currentUser={currentUser}
        unreadCount={unreadNotificationsCount}
        onOpenCreateChit={() => setIsCreateChitOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Global Header */}
        <Header
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
          unreadCount={unreadNotificationsCount}
          onOpenCreateChit={() => setIsCreateChitOpen(true)}
          currentUser={currentUser}
          allUsers={allUsers}
          onSwitchUser={(user) => {
            storageService.setCurrentUser(user);
            setCurrentUser(user);
          }}
          isDemoMode={isDemoMode}
          onResetDemoData={handleClearAllData}
          onOpenSupabaseConnect={() => setIsSupabaseModalOpen(true)}
          searchQuery={globalSearch}
          onSearchChange={setGlobalSearch}
        />

        {/* Workspace Central View Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* If a Chit Workspace is currently active */}
          {activeChitInstance ? (
            <ChitDetailWorkspace
              chit={activeChitInstance}
              onBack={() => setSelectedChitId(null)}
              allMembers={members}
              memberships={memberships}
              transactions={transactions}
              currentUser={currentUser}
              company={company}
              onOpenRecordPayment={(chitId, memberId) => {
                setPaymentPreselectedChit(chitId);
                setPaymentPreselectedMember(memberId);
                setIsRecordPaymentOpen(true);
              }}
              onOpenAssignMember={(chitId) => setAssignMemberChitId(chitId)}
              onRemoveMember={handleRemoveMemberSeat}
              onOpenLedger={(chitId, memberId) => setActiveLedgerTarget({ chitId, memberId })}
              onViewReceipt={(tx) => setActiveReceiptTx(tx)}
              onRequestReversal={(tx) => setReversalTargetTx(tx)}
              onEditPayment={(tx) => {
                setActiveEditingTx(tx);
                setIsRecordPaymentOpen(true);
              }}
              onRecordCashbookEntry={(chitId) => {
                setCashbookTargetChitId(chitId);
                setIsAddCashbookEntryOpen(true);
              }}
            />
          ) : currentTab === 'dashboard' ? (
            <DashboardView
              currentUser={currentUser}
              schemes={schemes}
              members={members}
              transactions={transactions}
              onOpenCreateChit={() => setIsCreateChitOpen(true)}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
              onOpenRecordPayment={() => {
                setPaymentPreselectedChit(undefined);
                setPaymentPreselectedMember(undefined);
                setIsRecordPaymentOpen(true);
              }}
              onSelectChit={(chitId) => setSelectedChitId(chitId)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onViewReceipt={(tx) => setActiveReceiptTx(tx)}
            />
          ) : currentTab === 'chits' ? (
            <AllChitsView
              schemes={schemes}
              memberships={memberships}
              transactions={transactions}
              onSelectChit={(chitId) => setSelectedChitId(chitId)}
              onOpenCreateChit={() => setIsCreateChitOpen(true)}
            />
          ) : currentTab === 'ledger' ? (
            <MasterLedgerView
              schemes={schemes}
              members={members}
              memberships={memberships}
              transactions={transactions}
              currentUser={currentUser}
              company={company}
              onOpenRecordPayment={(chitId, memberId) => {
                setPaymentPreselectedChit(chitId);
                setPaymentPreselectedMember(memberId);
                setIsRecordPaymentOpen(true);
              }}
              onViewReceipt={(tx) => setActiveReceiptTx(tx)}
              onRequestReversal={(tx) => setReversalTargetTx(tx)}
              onEditPayment={(tx) => {
                setActiveEditingTx(tx);
                setIsRecordPaymentOpen(true);
              }}
            />
          ) : currentTab === 'collections' ? (
            <CollectionsView
              schemes={schemes}
              members={members}
              transactions={transactions}
              currentUser={currentUser}
              onOpenRecordPayment={() => {
                setPaymentPreselectedChit(undefined);
                setPaymentPreselectedMember(undefined);
                setIsRecordPaymentOpen(true);
              }}
              onViewReceipt={(tx) => setActiveReceiptTx(tx)}
              onRequestReversal={(tx) => setReversalTargetTx(tx)}
              onEditPayment={(tx) => {
                setActiveEditingTx(tx);
                setIsRecordPaymentOpen(true);
              }}
            />
          ) : currentTab === 'cashbook' ? (
            <CashbookView
              schemes={schemes}
              members={members}
              transactions={transactions}
              onOpenAddEntry={() => {
                setCashbookTargetChitId(undefined);
                setIsAddCashbookEntryOpen(true);
              }}
            />
          ) : currentTab === 'reminders' ? (
            <RemindersView
              schemes={schemes}
              members={members}
              memberships={memberships}
              transactions={transactions}
              company={company}
              currentUser={currentUser}
            />

          ) : currentTab === 'settings' ? (
            <SettingsView
              company={company}
              currentUser={currentUser}
              allUsers={allUsers}
              auditLogs={auditLogs}
              onUpdateCompany={(updated) => {
                storageService.updateCompanyProfile(updated);
                reloadData();
              }}
              onAddUser={(usr) => {
                storageService.addUser(usr);
                reloadData();
              }}
              onExportBackup={handleExportBackup}
              onOpenSupabaseConnect={() => setIsSupabaseModalOpen(true)}
              onResetDemoData={handleClearAllData}
              isDemoMode={isDemoMode}
            />
          ) : null}
        </main>
      </div>

      {/* 1. Multi-Step Create Chit & Add Members Wizard */}
      <CreateChitWizardModal
        isOpen={isCreateChitOpen}
        onClose={() => setIsCreateChitOpen(false)}
        existingSchemes={schemes}
        existingMembers={members}
        onSaveChitWithMembers={handleSaveChitWithMembers}
        onChitCreated={(newChitId) => {
          setSelectedChitId(newChitId);
        }}
      />

      {/* 2. Add Member */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSubmit={handleAddMember}
        existingMembers={members}
      />

      {/* 3. CSV & Excel Import */}
      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImport={handleCsvImport}
        existingMembers={members}
      />

      {/* 4. Record Payment */}
      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => {
          setIsRecordPaymentOpen(false);
          setActiveEditingTx(null);
        }}
        schemes={schemes}
        members={members}
        memberships={memberships}
        transactions={transactions}
        preselectedChitId={paymentPreselectedChit}
        preselectedMemberId={paymentPreselectedMember}
        editingTransaction={activeEditingTx}
        onSubmit={handleRecordPayment}
        onUpdatePayment={handleUpdatePayment}
        onUndoPayment={(txId) => {
          handleConfirmReversal(txId, 'Mistaken payment undone');
          setActiveEditingTx(null);
        }}
      />

      {/* 5. Official Receipt */}
      <ReceiptModal
        transaction={activeReceiptTx}
        onClose={() => setActiveReceiptTx(null)}
        company={company}
        scheme={activeReceiptTx ? schemes.find((s) => s.id === activeReceiptTx.chit_id) : undefined}
        member={activeReceiptTx && activeReceiptTx.member_id ? members.find((m) => m.id === activeReceiptTx.member_id) : undefined}
      />

      {/* 6. Reversal Authorization */}
      <ReversalModal
        transaction={reversalTargetTx}
        onClose={() => setReversalTargetTx(null)}
        currentUser={currentUser}
        onConfirmReversal={handleConfirmReversal}
        onEditInstead={(tx) => {
          setActiveEditingTx(tx);
          setIsRecordPaymentOpen(true);
        }}
      />

      {/* 7. Member Profile & Participation */}
      <MemberProfileModal
        member={activeProfileMember}
        onClose={() => setActiveProfileMember(null)}
        memberships={memberships}
        schemes={schemes}
        onOpenLedger={(chitId, memberId) => setActiveLedgerTarget({ chitId, memberId })}
        onUpdateMember={handleUpdateMember}
      />

      {/* 8. Scoped Member Ledger */}
      {activeLedgerData && (
        <MemberLedgerModal
          isOpen={Boolean(activeLedgerTarget)}
          onClose={() => setActiveLedgerTarget(null)}
          chit={activeLedgerData.chit}
          membership={activeLedgerData.membership}
          member={activeLedgerData.member}
          allTransactions={transactions}
          currentUser={currentUser}
          onOpenRecordPayment={(chitId, memberId) => {
            setPaymentPreselectedChit(chitId);
            setPaymentPreselectedMember(memberId);
            setIsRecordPaymentOpen(true);
          }}
          onViewReceipt={(tx) => setActiveReceiptTx(tx)}
          onRequestReversal={(tx) => setReversalTargetTx(tx)}
          onEditPayment={(tx) => {
            setActiveEditingTx(tx);
            setIsRecordPaymentOpen(true);
          }}
        />
      )}

      {/* 9. Assign Member to Chit Seat */}
      {assignMemberChitId && (
        <AssignMemberModal
          isOpen={Boolean(assignMemberChitId)}
          onClose={() => setAssignMemberChitId(null)}
          chit={schemes.find((s) => s.id === assignMemberChitId)!}
          allMembers={members}
          existingMemberships={memberships}
          onAssign={handleAssignSeat}
          onOpenCreateMember={() => setIsAddMemberOpen(true)}
        />
      )}

      {/* 10. Cashbook Custom Movement (Payout / Expense) */}
      <AddCashbookEntryModal
        isOpen={isAddCashbookEntryOpen}
        onClose={() => setIsAddCashbookEntryOpen(false)}
        schemes={schemes}
        defaultChitId={cashbookTargetChitId}
        onSubmit={handleRecordCustomCashbookEntry}
      />

      {/* 11. Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          storageService.markNotificationAsRead(id);
          reloadData();
        }}
        onMarkAllRead={() => {
          storageService.markAllNotificationsRead();
          reloadData();
        }}
        onSelectNotification={(item) => {
          if (item.chit_id) {
            setSelectedChitId(item.chit_id);
          }
        }}
      />

      {/* 12. Supabase Connect & Migration Guide */}
      <SupabaseConnectModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        isConfigured={isSupabaseConfigured()}
      />
    </div>
  );
}

export default App;
