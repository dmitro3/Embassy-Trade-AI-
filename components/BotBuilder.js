import { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

const BotAction = ({ id, text, onRemove }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'action',
    item: { id, text },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <div
      ref={drag}
      className={`p-3 bg-gray-700 rounded-lg mb-2 ${isDragging ? 'opacity-50' : ''} cursor-move relative group`}
    >
      <span className="text-white">{text}</span>
      {onRemove && (
        <button
          onClick={() => onRemove(id)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

const ActionDropZone = ({ onDrop, className }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'action',
    drop: (item) => onDrop(item),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <div
      ref={drop}
      className={`p-4 border-2 border-dashed rounded-lg ${
        isOver ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
      } ${className}`}
    >
      <p className="text-gray-400 text-center">Drop actions here to build your bot</p>
    </div>
  );
};

const AVAILABLE_ACTIONS = [
  { id: 'buy', text: 'Buy EMB' },
  { id: 'sell', text: 'Sell EMB' },
  { id: 'stop_loss', text: 'Set Stop Loss' },
  { id: 'take_profit', text: 'Set Take Profit' },
  { id: 'trend_follow', text: 'Follow Trend' },
  { id: 'price_alert', text: 'Price Alert' },
  { id: 'volume_alert', text: 'Volume Alert' },
  { id: 'ai_signal', text: 'Use AI Signal' },
];

const CONDITIONS = [
  { id: 'price_above', text: 'Price Above' },
  { id: 'price_below', text: 'Price Below' },
  { id: 'volume_spike', text: 'Volume Spike' },
  { id: 'ai_confidence', text: 'AI Confidence > 80%' },
];

export default function BotBuilder() {
  const [botActions, setBotActions] = useState([]);
  const [selectedConditions, setSelectedConditions] = useState([]);
  const [botName, setBotName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleDrop = useCallback((item) => {
    setBotActions((prev) => [...prev, { ...item, uniqueId: Date.now() }]);
  }, []);

  const handleRemoveAction = useCallback((uniqueId) => {
    setBotActions((prev) => prev.filter((action) => action.uniqueId !== uniqueId));
  }, []);

  const toggleCondition = useCallback((condition) => {
    setSelectedConditions((prev) => {
      if (prev.find((c) => c.id === condition.id)) {
        return prev.filter((c) => c.id !== condition.id);
      }
      return [...prev, condition];
    });
  }, []);

  const handleSave = async () => {
    if (!botName) {
      alert('Please enter a name for your bot');
      return;
    }
    setIsSaving(true);
    // TODO: Implement bot saving logic
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Bot saved successfully!');
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="p-6 bg-gray-800 rounded-lg">
        <h2 className="text-2xl font-bold text-blue-400 mb-6">Trading Bot Builder</h2>
        
        <div className="mb-6">
          <label className="block text-gray-400 mb-2">Bot Name</label>
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            className="w-full p-2 bg-gray-700 rounded border border-gray-600 text-white"
            placeholder="Enter bot name..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium text-gray-300 mb-4">Available Actions</h3>
            <div className="space-y-2">
              {AVAILABLE_ACTIONS.map((action) => (
                <BotAction key={action.id} {...action} />
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-300 mb-4">Bot Configuration</h3>
            <ActionDropZone onDrop={handleDrop} className="mb-4" />
            
            <div className="mt-4 space-y-2">
              {botActions.map((action) => (
                <BotAction
                  key={action.uniqueId}
                  {...action}
                  onRemove={handleRemoveAction}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-300 mb-4">Trading Conditions</h3>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((condition) => (
              <button
                key={condition.id}
                onClick={() => toggleCondition(condition)}
                className={`px-3 py-2 rounded-full text-sm ${
                  selectedConditions.find((c) => c.id === condition.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300'
                }`}
              >
                {condition.text}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={isSaving || !botName || botActions.length === 0}
            className={`px-6 py-2 rounded ${
              isSaving || !botName || botActions.length === 0
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white transition-colors`}
          >
            {isSaving ? 'Saving...' : 'Save Bot'}
          </button>
        </div>
      </div>
    </DndProvider>
  );
}