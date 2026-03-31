import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, buttonSecondary, focusRing, panel, panelGold } from '../theme/theme';

const socket: Socket = io(SERVER_URL);

type EditorRound = 'jeopardy' | 'double' | 'final';

export const EditorView: React.FC = () => {
  const [allBoards, setAllBoards] = useState<any>(null);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<EditorRound>('jeopardy');
  const [showSidebar, setShowSidebar] = useState(false);
  
  const [editingCell, setEditingCell] = useState<{cIdx: number, qIdx: number} | null>(null);
  const [editForm, setEditForm] = useState({ question: '', answer: '', value: 0 });
  const [editingFJ, setEditingFJ] = useState(false);
  const [fjForm, setFjForm] = useState({ category: '', clue: '', answer: '' });
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.on('all-boards-data', (data) => {
      setAllBoards(data.boards);
      setActiveBoardId(data.activeBoardId);
      if (!selectedBoardId && data.activeBoardId) {
        setSelectedBoardId(data.activeBoardId);
      }
    });

    socket.on('save-success', () => setIsSaving(false));
    
    const requestData = () => socket.emit('request-all-boards');
    if (socket.connected) requestData();
    else socket.on('connect', requestData);

    return () => {
      socket.off('all-boards-data');
      socket.off('save-success');
      socket.off('connect');
    };
  }, [selectedBoardId]);

  const currentGameData = allBoards?.[selectedBoardId]?.data;
  const currentBoardName = allBoards?.[selectedBoardId]?.name || '';

  const getCategories = () => {
    if (!currentGameData?.rounds) return [];
    if (selectedRound === 'jeopardy') return currentGameData.rounds.jeopardy?.categories || [];
    if (selectedRound === 'double') return currentGameData.rounds.double?.categories || [];
    return [];
  };

  const categories = getCategories();

  const handleEditClick = (cIdx: number, qIdx: number) => {
    if (!categories[cIdx]) return;
    const q = categories[cIdx].questions[qIdx];
    setEditingCell({ cIdx, qIdx });
    setEditForm({
      question: q.question === 'Enter question here...' ? '' : q.question,
      answer: q.answer === 'Enter answer here...' ? '' : q.answer,
      value: q.value,
    });
  };

  const handleCategoryChange = (cIdx: number, newName: string) => {
    if (!currentGameData) return;
    const newData = JSON.parse(JSON.stringify(currentGameData));
    if (selectedRound === 'jeopardy') {
      newData.rounds.jeopardy.categories[cIdx].name = newName;
    } else if (selectedRound === 'double') {
      newData.rounds.double.categories[cIdx].name = newName;
    }
    saveBoard(newData);
  };

  const handleBoardNameChange = (newName: string) => {
    if (!allBoards || !selectedBoardId) return;
    const updated = { ...allBoards };
    updated[selectedBoardId].name = newName;
    setAllBoards(updated);
  };

  const saveBoardName = () => {
    if (!allBoards || !selectedBoardId) return;
    setIsSaving(true);
    socket.emit('save-board', { boardId: selectedBoardId, name: allBoards[selectedBoardId].name });
  };

  const saveBoard = (newData: any) => {
    const updated = { ...allBoards };
    updated[selectedBoardId].data = newData;
    setAllBoards(updated);
    setIsSaving(true);
    socket.emit('save-board', { boardId: selectedBoardId, data: newData });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCell && currentGameData) {
      const newData = JSON.parse(JSON.stringify(currentGameData));
      const target = selectedRound === 'jeopardy' 
        ? newData.rounds.jeopardy.categories 
        : newData.rounds.double.categories;
      target[editingCell.cIdx].questions[editingCell.qIdx] = {
        ...target[editingCell.cIdx].questions[editingCell.qIdx],
        ...editForm,
      };
      saveBoard(newData);
      setEditingCell(null);
    }
  };

  const handleEditFJ = () => {
    if (!currentGameData?.finalJeopardy) return;
    const fj = currentGameData.finalJeopardy;
    setFjForm({ category: fj.category || '', clue: fj.clue || '', answer: fj.answer || '' });
    setEditingFJ(true);
  };

  const handleSaveFJ = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentGameData) {
      const newData = JSON.parse(JSON.stringify(currentGameData));
      newData.finalJeopardy = fjForm;
      saveBoard(newData);
      setEditingFJ(false);
    }
  };

  const createNewBoard = () => {
    const name = prompt('Enter name for new board:');
    if (name) socket.emit('create-board', name);
  };

  const deleteBoard = (id: string) => {
    if (confirm('Delete this board?')) {
      socket.emit('delete-board', id);
      if (selectedBoardId === id) setSelectedBoardId('');
    }
  };

  const switchActiveBoard = (id: string) => socket.emit('switch-board', id);

  // === LOADING ===
  if (!allBoards) {
    return (
      <JeopardyShell backgroundMode="viewport">
        <div className="min-h-dvh w-full flex items-center justify-center p-6">
          <div className={`${panel} p-8`}>
            <h1 className="font-display text-2xl text-amber-400">Loading Editor...</h1>
          </div>
        </div>
      </JeopardyShell>
    );
  }

  return (
    <JeopardyShell backgroundMode="viewport">
      <div className="min-h-dvh w-full flex flex-col lg:flex-row">
        
        {/* Mobile Header */}
        <header className="lg:hidden shrink-0 px-4 pt-4 pb-3 border-b border-slate-700/50 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white p-1">←</button>
          <h1 className="font-display text-lg text-amber-400">Board Editor</h1>
          <button 
            onClick={() => setShowSidebar(true)}
            className="p-2 rounded-lg bg-slate-800/80 text-slate-300"
          >
            📁
          </button>
        </header>

        {/* Sidebar - Desktop always visible, Mobile as overlay */}
        <aside className={`
          ${showSidebar ? 'fixed inset-0 z-50 flex' : 'hidden'}
          lg:relative lg:flex lg:z-auto lg:inset-auto
          lg:w-64 lg:shrink-0
        `}>
          {/* Backdrop (mobile only) */}
          <div 
            className="absolute inset-0 bg-black/60 lg:hidden"
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Sidebar Content */}
          <div className="relative w-72 lg:w-full h-full bg-slate-900/95 border-r border-slate-700/50 flex flex-col">
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
              <h2 className="font-display text-xl text-slate-100">Saved Boards</h2>
              <button 
                className="lg:hidden text-slate-400 hover:text-white p-1"
                onClick={() => setShowSidebar(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {Object.entries(allBoards).map(([id, board]: [string, any]) => (
                <div 
                  key={id}
                  onClick={() => { setSelectedBoardId(id); setShowSidebar(false); }}
                  className={`p-3 rounded-xl cursor-pointer transition-all relative group ${
                    selectedBoardId === id 
                      ? 'bg-amber-500/15 border border-amber-400/30' 
                      : 'bg-slate-800/50 border border-transparent hover:bg-slate-800'
                  }`}
                >
                  <div className="font-medium text-sm truncate pr-6">{board.name}</div>
                  {activeBoardId === id && (
                    <div className="text-[10px] text-emerald-400 font-mono mt-1 uppercase tracking-wider">● Active</div>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBoard(id); }}
                    className="absolute right-2 top-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 p-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t border-slate-700/50 space-y-2">
              <button onClick={createNewBoard} className={`w-full py-2.5 rounded-xl text-sm ${buttonPrimary}`}>
                + New Board
              </button>
              <button onClick={() => navigate('/')} className="w-full text-slate-400 hover:text-white text-sm py-2">
                ← Exit
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedBoardId && currentGameData ? (
            <>
              {/* Editor Header */}
              <div className="shrink-0 px-4 py-3 border-b border-slate-700/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <input
                  value={currentBoardName}
                  onChange={(e) => handleBoardNameChange(e.target.value)}
                  onBlur={saveBoardName}
                  className={`text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-amber-400/30 focus:border-amber-400 outline-none w-full sm:w-auto ${focusRing}`}
                  placeholder="Board Name"
                />
                
                <div className="flex items-center gap-3">
                  <span className={`text-xs ${isSaving ? 'text-amber-400' : 'text-slate-500'}`}>
                    {isSaving ? '⏳ Saving...' : '✓ Saved'}
                  </span>
                  {activeBoardId !== selectedBoardId ? (
                    <button onClick={() => switchActiveBoard(selectedBoardId)} className={`px-4 py-2 rounded-lg text-xs ${buttonPrimary}`}>
                      Set Active
                    </button>
                  ) : (
                    <span className="bg-emerald-900/50 text-emerald-300 px-4 py-2 rounded-lg text-xs font-bold">
                      ● Active
                    </span>
                  )}
                </div>
              </div>

              {/* Round Tabs */}
              <div className="shrink-0 flex border-b border-slate-700/50 overflow-x-auto scrollbar-hide">
                {(['jeopardy', 'double', 'final'] as EditorRound[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRound(r)}
                    className={`px-4 sm:px-6 py-3 font-bold text-xs sm:text-sm uppercase tracking-wider whitespace-nowrap transition-all ${
                      selectedRound === r
                        ? r === 'final' 
                          ? 'bg-amber-600 text-slate-900 border-b-2 border-amber-400' 
                          : r === 'double'
                          ? 'bg-purple-600 text-white border-b-2 border-amber-400'
                          : 'bg-blue-600 text-white border-b-2 border-amber-400'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`}
                  >
                    {r === 'jeopardy' ? 'Round 1' : r === 'double' ? 'Round 2' : 'Final'}
                  </button>
                ))}
              </div>

              {/* Grid or Final Jeopardy */}
              <div className="flex-1 overflow-auto p-4">
                {selectedRound !== 'final' ? (
                  <div className="grid grid-cols-5 gap-2 h-full" style={{ gridTemplateRows: 'auto repeat(5, 1fr)' }}>
                    {/* Category Headers */}
                    {categories.map((c: any, cIdx: number) => (
                      <textarea
                        key={`cat-${cIdx}`}
                        value={c.name}
                        onChange={(e) => handleCategoryChange(cIdx, e.target.value)}
                        className={`text-center font-bold text-white p-2 rounded-lg border border-slate-600/50 uppercase resize-none text-[10px] sm:text-xs md:text-sm min-h-[50px] ${
                          selectedRound === 'double' ? 'bg-purple-900/60' : 'bg-blue-900/60'
                        } ${focusRing}`}
                        placeholder="CATEGORY"
                      />
                    ))}

                    {/* Question Tiles */}
                    {Array.from({ length: 5 }).map((_, r) => (
                      categories.map((c: any, cIdx: number) => {
                        const q = c.questions[r];
                        const hasContent = q?.question && q?.answer;
                        return (
                          <button
                            key={`${cIdx}-${r}`}
                            onClick={() => handleEditClick(cIdx, r)}
                            className={`p-2 rounded-lg border border-slate-600/30 flex flex-col items-center justify-center text-center relative transition-all hover:border-amber-400/50 hover:scale-[1.02] ${
                              selectedRound === 'double' ? 'bg-purple-900/40' : 'bg-blue-900/40'
                            }`}
                          >
                            <span className="text-amber-400 font-bold text-sm sm:text-base">${q?.value || 0}</span>
                            <span className="text-[8px] sm:text-xs text-slate-400 line-clamp-2 mt-1 px-1">
                              {q?.question || <span className="italic opacity-50">Empty</span>}
                            </span>
                            {hasContent && (
                              <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full opacity-60" />
                            )}
                          </button>
                        );
                      })
                    ))}
                  </div>
                ) : (
                  /* Final Jeopardy */
                  <div className="h-full flex items-center justify-center">
                    <div className={`${panelGold} w-full max-w-lg p-6`}>
                      <h2 className="font-display text-2xl text-amber-400 text-center mb-6">Final Jeopardy!</h2>
                      
                      {currentGameData.finalJeopardy ? (
                        <div className="space-y-4 text-center">
                          <div>
                            <div className="text-slate-500 text-xs uppercase mb-1">Category</div>
                            <div className="text-lg font-bold">{currentGameData.finalJeopardy.category || 'Not set'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs uppercase mb-1">Clue</div>
                            <div className="text-base font-serif">{currentGameData.finalJeopardy.clue || 'Not set'}</div>
                          </div>
                          <div>
                            <div className="text-slate-500 text-xs uppercase mb-1">Answer</div>
                            <div className="text-emerald-400 font-bold">{currentGameData.finalJeopardy.answer || 'Not set'}</div>
                          </div>
                          <button onClick={handleEditFJ} className={`w-full py-3 rounded-xl mt-4 ${buttonPrimary}`}>
                            Edit
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-slate-500">
                          <p>No Final Jeopardy set</p>
                          <button onClick={handleEditFJ} className={`py-3 px-8 rounded-xl mt-4 ${buttonPrimary}`}>
                            Create
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
              <span className="text-5xl mb-4 opacity-30">📋</span>
              <p className="text-lg">Select a board to edit</p>
            </div>
          )}
        </main>
      </div>

      {/* Edit Question Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-2xl text-amber-400 mb-4">Edit Question</h2>
            
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs uppercase mb-1">Question/Clue</label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                  className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white h-28 resize-none ${focusRing}`}
                  placeholder="Enter question..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-500 text-xs uppercase mb-1">Answer</label>
                  <input
                    type="text"
                    value={editForm.answer}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                    className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white ${focusRing}`}
                    placeholder="Answer..."
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-xs uppercase mb-1">Value ($)</label>
                  <input
                    type="number"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: parseInt(e.target.value) || 0 })}
                    className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white ${focusRing}`}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingCell(null)} className={`flex-1 py-3 rounded-xl ${buttonSecondary}`}>
                  Cancel
                </button>
                <button type="submit" className={`flex-1 py-3 rounded-xl ${buttonPrimary}`}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Final Jeopardy Modal */}
      {editingFJ && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="font-display text-2xl text-amber-400 mb-4">Edit Final Jeopardy</h2>
            
            <form onSubmit={handleSaveFJ} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-xs uppercase mb-1">Category</label>
                <input
                  type="text"
                  value={fjForm.category}
                  onChange={(e) => setFjForm({ ...fjForm, category: e.target.value })}
                  className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white ${focusRing}`}
                  placeholder="Category..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs uppercase mb-1">Clue</label>
                <textarea
                  value={fjForm.clue}
                  onChange={(e) => setFjForm({ ...fjForm, clue: e.target.value })}
                  className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white h-28 resize-none ${focusRing}`}
                  placeholder="Final Jeopardy clue..."
                />
              </div>

              <div>
                <label className="block text-slate-500 text-xs uppercase mb-1">Answer</label>
                <input
                  type="text"
                  value={fjForm.answer}
                  onChange={(e) => setFjForm({ ...fjForm, answer: e.target.value })}
                  className={`w-full p-3 rounded-xl bg-slate-800/80 border border-slate-600/50 text-white ${focusRing}`}
                  placeholder="What is..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingFJ(false)} className={`flex-1 py-3 rounded-xl ${buttonSecondary}`}>
                  Cancel
                </button>
                <button type="submit" className={`flex-1 py-3 rounded-xl ${buttonPrimary}`}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </JeopardyShell>
  );
};
