import { useState } from 'react';
import { ViewMode, DesktopState, RoleInfo } from './types';
import TopHeader from './components/TopHeader';
import DesktopCanvas from './components/DesktopCanvas';
import MobileMockups from './components/MobileMockups';
import ContactModal from './components/ContactModal';
import LegalModal from './components/LegalModal';
import RoleModal from './components/RoleModal';

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [desktopState, setDesktopState] = useState<DesktopState>(1);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);

  return (
    <div className="min-h-screen bg-[#0f131c] text-[#181C26] selection:bg-[#E91E82] selection:text-white flex flex-col">
      {/* Sticky Top Toolbar with Brand & Quick Switchers */}
      <TopHeader
        viewMode={viewMode}
        setViewMode={setViewMode}
        desktopState={desktopState}
        setDesktopState={setDesktopState}
      />

      {/* Main Content Area */}
      <main className="w-full mx-auto px-3 sm:px-6 py-8 space-y-16 flex-1">
        {/* DESKTOP 1440px VIEW */}
        {(viewMode === 'all' || viewMode === 'desktop') && (
          <DesktopCanvas
            desktopState={desktopState}
            setDesktopState={setDesktopState}
            onOpenContact={() => setIsContactOpen(true)}
            onOpenLegal={(type) => setLegalModalType(type)}
            onOpenRole={(role) => setSelectedRole(role)}
          />
        )}

        {/* MOBILE 390px (4 ESTADOS) VIEW */}
        {(viewMode === 'all' || viewMode === 'mobile') && (
          <MobileMockups
            onOpenContact={() => setIsContactOpen(true)}
            onOpenLegal={(type) => setLegalModalType(type)}
          />
        )}
      </main>

      {/* Interactive Modals */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />

      <RoleModal
        role={selectedRole}
        onClose={() => setSelectedRole(null)}
      />
    </div>
  );
}
