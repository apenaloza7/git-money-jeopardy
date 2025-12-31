import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { SERVER_URL } from '../../constants';
import { JeopardyShell } from '../theme/JeopardyShell';
import { buttonPrimary, buttonSecondary, focusRingGold, panel, panelGold } from '../theme/theme';

const socket: Socket = io(SERVER_URL);

type EditorRound = 'jeopardy' | 'double' | 'final';

export const EditorView: React.FC = () => {
  const [allBoards, setAllBoards] = useState<any>(null);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const [selectedRound, setSelectedRound] = useState<EditorRound>('jeopardy');
  
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
      
      if (!selectedBoardId && data.activeBoardId && data.boards[data.activeBoardId]) {
        setSelectedBoardId(data.activeBoardId);
      }
    });

    socket.on('save-success', () => {
      setIsSaving(false);
    });
    
    if (socket.connected) {
      socket.emit('request-all-boards');
    } else {
      socket.on('connect', () => {
         socket.emit('request-all-boards');
      });
    }

    return () => {
      socket.off('all-boards-data');
      socket.off('save-success');
      socket.off('connect');
    };
  }, [selectedBoardId]);

  const currentGameData = allBoards && selectedBoardId ? allBoards[selectedBoardId]?.data : null;
  const currentBoardName = allBoards && selectedBoardId ? allBoards[selectedBoardId]?.name : "";

  // Get categories for selected round
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
    const question = q.question === "Enter question here..." ? "" : q.question;
    const answer = q.answer === "Enter answer here..." ? "" : q.answer;
    setEditForm({ question, answer, value: q.value });
  };

  const handleCategoryChange = (cIdx: number, newName: string) => {
    if (!currentGameData) return;
    const newData = JSON.parse(JSON.stringify(currentGameData));
    
    if (newData.rounds) {
      if (selectedRound === 'jeopardy') {
        newData.rounds.jeopardy.categories[cIdx].name = newName;
      } else if (selectedRound === 'double') {
        newData.rounds.double.categories[cIdx].name = newName;
      }
    } else {
      newData.categories[cIdx].name = newName;
    }
    
    saveBoard(newData);
  };

  const handleBoardNameChange = (newName: string) => {
    if (!allBoards || !selectedBoardId) return;
    const updatedBoards = { ...allBoards };
    updatedBoards[selectedBoardId].name = newName;
    setAllBoards(updatedBoards);
  };

  const saveBoardName = () => {
    if (!allBoards || !selectedBoardId) return;
    setIsSaving(true);
    socket.emit('save-board', {
      boardId: selectedBoardId,
      name: allBoards[selectedBoardId].name
    });
  };

  const saveBoard = (newData: any) => {
    const updatedBoards = { ...allBoards };
    updatedBoards[selectedBoardId].data = newData;
    setAllBoards(updatedBoards);

    setIsSaving(true);
    socket.emit('save-board', { 
      boardId: selectedBoardId, 
      data: newData 
    });
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCell && currentGameData) {
      const newData = JSON.parse(JSON.stringify(currentGameData));
      
      if (newData.rounds) {
        if (selectedRound === 'jeopardy') {
          newData.rounds.jeopardy.categories[editingCell.cIdx].questions[editingCell.qIdx] = {
            ...newData.rounds.jeopardy.categories[editingCell.cIdx].questions[editingCell.qIdx],
            ...editForm
          };
        } else if (selectedRound === 'double') {
          newData.rounds.double.categories[editingCell.cIdx].questions[editingCell.qIdx] = {
            ...newData.rounds.double.categories[editingCell.cIdx].questions[editingCell.qIdx],
            ...editForm
          };
        }
      } else {
        newData.categories[editingCell.cIdx].questions[editingCell.qIdx] = {
          ...newData.categories[editingCell.cIdx].questions[editingCell.qIdx],
          ...editForm
        };
      }
      
      saveBoard(newData);
      setEditingCell(null);
    }
  };

  const handleEditFJ = () => {
    if (!currentGameData?.finalJeopardy) return;
    const fj = currentGameData.finalJeopardy;
    setFjForm({
      category: fj.category || '',
      clue: fj.clue || '',
      answer: fj.answer || ''
    });
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
    const name = prompt("Enter name for new board:");
    if (name) {
      socket.emit('create-board', name);
    }
  };

  const deleteBoard = (id: string) => {
    if (confirm("Are you sure you want to delete this board?")) {
      socket.emit('delete-board', id);
      if (selectedBoardId === id) {
        setSelectedBoardId('');
      }
    }
  };

  const switchActiveBoard = (id: string) => {
    socket.emit('switch-board', id);
  };

  if (!allBoards) {
    return (
      <JeopardyShell withContainer>
        <div className={[panel, 'p-8'].join(' ')}>
          <h1 className="font-display text-3xl font-extrabold text-yellow-400 tracking-wider">
            Loading Editor...
          </h1>
        </div>
      </JeopardyShell>
    );
  }

  return (
    <JeopardyShell className="h-screen">
    <div className="h-screen text-white flex overflow-hidden">
      {/* Sidebar - Board List */}
      <div className="w-64 bg-[#06103a]/80 border-r border-yellow-400/10 flex flex-col shrink-0 z-20 shadow-xl">
        <div className="p-4 border-b border-yellow-400/10 bg-[#06103a]/80">
             <h2 className="font-display text-2xl font-extrabold text-slate-100 tracking-wide">Saved Boards</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
          {Object.entries(allBoards).map(([id, board]: [string, any]) => (
            <div 
              key={id}
              onClick={() => setSelectedBoardId(id)}
              className={`p-3 rounded cursor-pointer transition-colors relative group
                ${selectedBoardId === id ? 'bg-yellow-500/15 text-yellow-200 shadow-md border border-yellow-400/25' : 'bg-[#0a1c5a]/40 text-slate-200/80 hover:bg-[#0a1c5a]/60 border border-transparent'}
              `}
            >
              <div className="font-bold truncate pr-6 text-sm">{board.name}</div>
              {activeBoardId === id && (
                <div className="text-[10px] text-green-300 font-mono mt-1 uppercase tracking-wider font-bold">● Active Game</div>
              )}
              
              <button
                onClick={(e) => { e.stopPropagation(); deleteBoard(id); }}
                className="absolute right-2 top-2 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-900/50 rounded"
                title="Delete Board"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-yellow-400/10 bg-[#06103a]/60 space-y-2">
            <button 
            onClick={createNewBoard}
            className={['w-full py-2 rounded text-sm', buttonPrimary].join(' ')}
            >
            + New Board
            </button>
            <button 
            onClick={() => navigate('/')}
            className="w-full text-slate-200/70 hover:text-white text-sm py-2 transition-colors flex items-center justify-center gap-2"
            >
            <span>←</span> Exit to Home
            </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedBoardId && currentGameData ? (
          <>
            {/* Editor Header */}
            <div className="flex justify-between items-center bg-[#0a1c5a]/55 p-4 border-b border-yellow-400/10 shrink-0 shadow-md z-10">
              <div className="flex-1 mr-8">
                <input
                   value={currentBoardName}
                   onChange={(e) => handleBoardNameChange(e.target.value)}
                   onBlur={saveBoardName}
                   className={[
                     'text-2xl font-bold text-white bg-transparent border-b border-transparent hover:border-yellow-400/30 focus:border-yellow-400 outline-none transition-colors w-full px-2 py-1 rounded hover:bg-slate-950/20',
                     focusRingGold,
                   ].join(' ')}
                   placeholder="Enter Board Name"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-slate-400 text-xs font-mono">
                    {isSaving ? (
                        <span className="text-yellow-400 animate-pulse flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-400"/> Saving...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2 text-slate-500">
                             <span className="w-2 h-2 rounded-full bg-green-500/50"/> Auto-Saved
                        </span>
                    )}
                </div>

                 {activeBoardId !== selectedBoardId ? (
                     <button 
                       onClick={() => switchActiveBoard(selectedBoardId)}
                       className={['px-4 py-2 rounded text-xs uppercase tracking-wide', buttonPrimary].join(' ')}
                     >
                       Set Active
                     </button>
                   ) : (
                     <span className="bg-green-900/50 text-green-300 px-4 py-2 rounded text-xs font-bold border border-green-800 uppercase tracking-wide cursor-default flex items-center gap-2">
                       <span>●</span> Active Game
                     </span>
                   )}
              </div>
            </div>

            {/* Round Selector Tabs */}
            <div className="flex border-b border-yellow-400/10 bg-[#0a1c5a]/30">
              <button
                onClick={() => setSelectedRound('jeopardy')}
                className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors
                  ${selectedRound === 'jeopardy' 
                    ? 'bg-blue-600 text-white border-b-2 border-yellow-400' 
                    : 'text-slate-400 hover:text-white hover:bg-blue-900/30'}
                `}
              >
                Jeopardy! Round
              </button>
              <button
                onClick={() => setSelectedRound('double')}
                className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors
                  ${selectedRound === 'double' 
                    ? 'bg-purple-600 text-white border-b-2 border-yellow-400' 
                    : 'text-slate-400 hover:text-white hover:bg-purple-900/30'}
                `}
              >
                Double Jeopardy! Round
              </button>
              <button
                onClick={() => setSelectedRound('final')}
                className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors
                  ${selectedRound === 'final' 
                    ? 'bg-yellow-600 text-black border-b-2 border-yellow-400' 
                    : 'text-slate-400 hover:text-white hover:bg-yellow-900/30'}
                `}
              >
                Final Jeopardy!
              </button>
            </div>

            {/* Editor Grid Area */}
            {selectedRound !== 'final' ? (
              <div className="flex-1 overflow-hidden p-4 flex flex-col">
                <div className="text-xs text-slate-500 mb-2 uppercase tracking-wider">
                  {selectedRound === 'double' ? 'Double Jeopardy (2x values)' : 'Jeopardy Round'}
                </div>
                <div className="flex-1 grid grid-cols-5 gap-3 h-full">
                    {/* Category Headers (Editable) */}
                    {categories.map((c: any, cIdx: number) => (
                        <div key={`cat-${cIdx}`} className="h-full max-h-[15%] min-h-[60px]">
                            <textarea
                            value={c.name}
                            onChange={(e) => handleCategoryChange(cIdx, e.target.value)}
                            className={[
                              `w-full h-full text-center font-bold text-white p-3 rounded-lg border border-yellow-400/15 outline-none uppercase resize-none shadow-md text-sm md:text-base flex items-center justify-center placeholder-blue-300/50
                              ${selectedRound === 'double' ? 'bg-purple-900/70' : 'bg-blue-900/70'}`,
                              focusRingGold,
                            ].join(' ')}
                            placeholder="CATEGORY NAME"
                            />
                        </div>
                    ))}

                    {/* Question Grid */}
                    {Array.from({ length: 5 }).map((_, r) => (
                        categories.map((c: any, cIdx: number) => (
                        <button
                            key={`${cIdx}-${r}`}
                            onClick={() => handleEditClick(cIdx, r)}
                            className={`w-full h-full p-2 rounded-lg border border-yellow-400/10 flex flex-col items-center justify-center text-center group transition-all hover:border-yellow-400/30 hover:shadow-xl hover:scale-[1.02] hover:z-10 relative overflow-hidden
                              ${selectedRound === 'double' ? 'bg-purple-900/40 hover:bg-purple-900/60' : 'bg-[#0a1c5a]/55 hover:bg-[#0a1c5a]/70'}
                            `}
                        >
                            <span className="text-yellow-400 font-bold mb-1 text-xl drop-shadow-md">${c.questions[r]?.value || 0}</span>
                            <div className="w-full px-2">
                                <span className="text-[10px] md:text-xs text-slate-400 line-clamp-3 group-hover:text-white leading-tight transition-colors">
                                {c.questions[r]?.question || <span className="italic opacity-30">No Question Set</span>}
                                </span>
                            </div>
                            
                            {c.questions[r]?.question && c.questions[r]?.answer && (
                                <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full opacity-50 group-hover:opacity-100 transition-opacity" title="Complete" />
                            )}
                        </button>
                        ))
                    ))}
                </div>
              </div>
            ) : (
              /* Final Jeopardy Editor */
              <div className="flex-1 overflow-hidden p-8 flex items-center justify-center">
                <div className={[panelGold, 'w-full max-w-2xl p-8'].join(' ')}>
                  <h2 className="font-display text-3xl font-extrabold text-yellow-400 text-center mb-8">
                    Final Jeopardy!
                  </h2>
                  
                  {currentGameData.finalJeopardy ? (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Category</div>
                        <div className="text-2xl font-bold text-white">
                          {currentGameData.finalJeopardy.category || 'Not set'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Clue</div>
                        <div className="text-lg text-white font-serif">
                          {currentGameData.finalJeopardy.clue || 'Not set'}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Answer</div>
                        <div className="text-lg text-green-400 font-bold">
                          {currentGameData.finalJeopardy.answer || 'Not set'}
                        </div>
                      </div>
                      
                      <button
                        onClick={handleEditFJ}
                        className={['w-full py-3 rounded-lg mt-4', buttonPrimary].join(' ')}
                      >
                        Edit Final Jeopardy
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500">
                      <p>No Final Jeopardy data found.</p>
                      <button
                        onClick={handleEditFJ}
                        className={['py-3 px-8 rounded-lg mt-4', buttonPrimary].join(' ')}
                      >
                        Create Final Jeopardy
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
            <span className="text-6xl opacity-20">✏️</span>
            <p className="text-xl font-medium">Select a board from the sidebar to start editing</p>
          </div>
        )}
      </div>

      {/* Edit Question Modal */}
      {editingCell && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#07154a] p-8 rounded-xl w-full max-w-2xl border border-yellow-400/20 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="font-display text-3xl font-extrabold mb-6 text-yellow-400 tracking-wide">
              Edit Question
              <span className={`ml-3 text-sm px-2 py-1 rounded ${selectedRound === 'double' ? 'bg-purple-600' : 'bg-blue-600'}`}>
                {selectedRound === 'double' ? 'Double Jeopardy' : 'Jeopardy'}
              </span>
            </h2>
            
            <form onSubmit={handleSaveForm} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Clue / Question</label>
                <textarea
                  value={editForm.question}
                  onChange={e => setEditForm({...editForm, question: e.target.value})}
                  className={[
                    'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white h-32 outline-none text-lg',
                    focusRingGold,
                  ].join(' ')}
                  placeholder="Enter question here..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Answer</label>
                  <input
                    type="text"
                    value={editForm.answer}
                    onChange={e => setEditForm({...editForm, answer: e.target.value})}
                    className={[
                      'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white outline-none',
                      focusRingGold,
                    ].join(' ')}
                    placeholder="Enter answer here..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-bold">Value ($)</label>
                  <input
                    type="number"
                    value={editForm.value}
                    onChange={e => setEditForm({...editForm, value: parseInt(e.target.value)})}
                    className={[
                      'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white outline-none',
                      focusRingGold,
                    ].join(' ')}
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-slate-700">
                <button 
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className={['flex-1 py-3 rounded transition-colors', buttonSecondary].join(' ')}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={['flex-1 py-3 rounded transition-all hover:scale-[1.02]', buttonPrimary].join(' ')}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Final Jeopardy Modal */}
      {editingFJ && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-[#07154a] p-8 rounded-xl w-full max-w-2xl border border-yellow-400/20 shadow-2xl animate-in zoom-in duration-200">
            <h2 className="font-display text-3xl font-extrabold mb-6 text-yellow-400 tracking-wide">
              Edit Final Jeopardy
            </h2>
            
            <form onSubmit={handleSaveFJ} className="space-y-4">
              <div>
                <label className="block text-slate-400 mb-1 font-bold">Category</label>
                <input
                  type="text"
                  value={fjForm.category}
                  onChange={e => setFjForm({...fjForm, category: e.target.value})}
                  className={[
                    'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white outline-none text-lg',
                    focusRingGold,
                  ].join(' ')}
                  placeholder="Enter category..."
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Clue</label>
                <textarea
                  value={fjForm.clue}
                  onChange={e => setFjForm({...fjForm, clue: e.target.value})}
                  className={[
                    'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white h-32 outline-none text-lg',
                    focusRingGold,
                  ].join(' ')}
                  placeholder="Enter the Final Jeopardy clue..."
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-bold">Answer</label>
                <input
                  type="text"
                  value={fjForm.answer}
                  onChange={e => setFjForm({...fjForm, answer: e.target.value})}
                  className={[
                    'w-full bg-slate-950/40 border border-yellow-400/15 p-4 rounded text-white outline-none',
                    focusRingGold,
                  ].join(' ')}
                  placeholder="What is..."
                />
              </div>

              <div className="flex gap-4 mt-8 pt-4 border-t border-slate-700">
                <button 
                  type="button"
                  onClick={() => setEditingFJ(false)}
                  className={['flex-1 py-3 rounded transition-colors', buttonSecondary].join(' ')}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className={['flex-1 py-3 rounded transition-all hover:scale-[1.02]', buttonPrimary].join(' ')}
                >
                  Save Final Jeopardy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </JeopardyShell>
  );
};
