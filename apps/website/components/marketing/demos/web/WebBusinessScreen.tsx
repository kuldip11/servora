type Props = {
  franchiseCreated: boolean;
  onFranchiseCreate: () => void;
  onNotice: (message: string) => void;
};

export const WebBusinessScreen = ({
  franchiseCreated,
  onFranchiseCreate,
  onNotice,
}: Props) => (
  <div className="mt-4 space-y-3">
    <div className="rounded-xl border border-[#dfe6e1] bg-white p-4">
      <div className="flex justify-between">
        <div>
          <span className="text-[8px] font-bold uppercase text-[#23724d]">
            Business
          </span>
          <strong className="mt-1 block text-sm">Olive & Ember Group</strong>
        </div>
        <button
          type="button"
          onClick={() => onNotice("Business editor opened")}
          className="text-[9px] font-bold text-[#174e36]"
        >
          Edit
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onNotice("Delhi Franchise details opened")}
          className="rounded-lg bg-[#edf3ef] p-3 text-left text-[9px]"
        >
          <strong className="block">Delhi Franchise</strong>
          <span className="text-[#6e7a72]">2 branches · View details</span>
        </button>
        <button
          type="button"
          onClick={onFranchiseCreate}
          className="rounded-lg border border-dashed border-[#b9c5bd] p-3 text-left text-[9px] font-bold text-[#174e36]"
        >
          {franchiseCreated ? "✓ North Region Franchise" : "+ Create franchise"}
        </button>
      </div>
    </div>
    <div className="rounded-xl border border-[#dfe6e1] bg-white p-4 text-[9px]">
      <strong>Branches</strong>
      <div className="mt-2 flex justify-between rounded-lg bg-[#f1f5f2] p-3">
        <span>Connaught Place</span>
        <button
          type="button"
          onClick={() => onNotice("Connaught Place branch opened")}
          className="font-bold text-[#23724d]"
        >
          Open · Edit
        </button>
      </div>
    </div>
  </div>
);
