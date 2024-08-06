import { useFetcher } from '@remix-run/react';
import {
  createContext,
  createRef,
  type KeyboardEvent,
  type MutableRefObject,
  type PropsWithChildren,
  type SyntheticEvent,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { X } from 'react-feather';

import { Divider } from './divider';
import { getPillCn } from './pill';
import { useOnClickOutside } from '../hooks/use-on-click-outside';
import { cx } from '../utils/cx';

type ItemType = {
  id: number;
  name: string;
  action: (event?: SyntheticEvent, cb?: () => void) => void | undefined; // onClick || onEnter
};

type selectedItemsType = {
  id: number;
  name: string;
};

/*
 * IMPLEMENT CREATE NEW ITEM (createFetcher)
 * FIX OVERFLOW & SCROLLING WITH KEYBOARD
 *
 */

const SearchComponentContext = createContext({
  searchRef: createRef() as MutableRefObject<HTMLInputElement | null>,
  selectedItems: [] as selectedItemsType[],
  setSelectedItems: (_: selectedItemsType[]) => {},
  textValue: '' as string,
  setTextValue: (_: string) => {},
  selectedIdx: -1 as number,
  setSelectedIdx: (_: number) => {},
  results: [] as ItemType[],
  setResults: (_: ItemType[]) => {},
  resultsBoxOpen: false as boolean,
  setResultsBoxOpen: (_: boolean) => {},
  KeyboardMode: false as boolean,
  setKeyboardMode: (_: boolean) => {},
});

export const SearchComponent = ({ children }: PropsWithChildren) => {
  const containerRef: MutableRefObject<HTMLDivElement | null> = useRef(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [selectedItems, setSelectedItems] = useState<selectedItemsType[]>([]);
  const [textValue, setTextValue] = useState<string>('');
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [results, setResults] = useState<ItemType[]>([]);
  const [resultsBoxOpen, setResultsBoxOpen] = useState<boolean>(false);
  const [KeyboardMode, setKeyboardMode] = useState(false);

  //const createFetcher = useFetcher<unknown>(); // TODO: IMPLEMENT CREATE NEW ITEM
  const listFetcher = useFetcher<ItemType[]>();

  useOnClickOutside(containerRef, () => {
    setResultsBoxOpen(false);
    setSelectedIdx(-1);
  });

  useEffect(() => {
    listFetcher.load('/api/tags/search');

    if (listFetcher.data) {
      const rawData: { tags: selectedItemsType[] } =
        listFetcher.data as unknown as {
          tags: selectedItemsType[];
        };

      const filteredData = rawData.tags.filter((item) => {
        return !selectedItems.some((selectedItem: selectedItemsType) => {
          return selectedItem.id === item.id;
        });
      });

      const queryData = filteredData.filter((item) => {
        return item.name.toLowerCase().startsWith(textValue.toLowerCase());
      });

      const convertedData = queryData.map((item) => ({
        ...item,
        action: (event?: SyntheticEvent, cb?: () => void) => {
          if (event) {
            // Handle mouse click (e.g., call cb directly)
            cb?.();
          } else {
            setSelectedItems([
              ...selectedItems,
              { id: results[selectedIdx].id, name: results[selectedIdx].name },
            ]);
            setTextValue('');
            setResultsBoxOpen(false);
          }
        },
      }));

      setResults(convertedData);
    } else {
      setResults([]); // Provide a default empty array if data is undefined
    }
  }, [textValue, selectedItems, resultsBoxOpen]);

  return (
    <SearchComponentContext.Provider
      value={{
        searchRef,
        selectedItems,
        setSelectedItems,
        textValue,
        setTextValue,
        selectedIdx,
        setSelectedIdx,
        results,
        setResults,
        resultsBoxOpen,
        setResultsBoxOpen,
        KeyboardMode,
        setKeyboardMode,
      }}
    >
      <div className="relative" ref={containerRef}>
        {children}
      </div>
    </SearchComponentContext.Provider>
  );
};

export function SearchValues() {
  const { selectedItems } = useContext(SearchComponentContext);

  return (
    <>
      {selectedItems.length > 0 && (
        <>
          <input
            name={'Label'}
            type="hidden"
            value={selectedItems.map((element) => element.name).join(',')}
          />

          <ul className="flex flex-wrap gap-1">
            {selectedItems.map((item) => {
              return <SearchValuesItem key={item.id} item={item} />;
            })}
          </ul>

          <Divider />
        </>
      )}
    </>
  );
}

type SearchValuesItemType = {
  item: selectedItemsType;
};

export function SearchValuesItem({ item }: SearchValuesItemType) {
  const { selectedItems, setSelectedItems } = useContext(
    SearchComponentContext
  );

  return (
    <li
      className={cx(
        getPillCn({ color: 'pink-100' }),
        'flex items-center gap-1'
      )}
      key={item.id}
    >
      {item.name}

      <button
        onClick={(event) => {
          event.stopPropagation();
          setSelectedItems(
            selectedItems.filter((selectedItem) => {
              return selectedItem.id !== item.id;
            })
          );
        }}
        type="button"
      >
        <X size={16} />
      </button>
    </li>
  );
}

export function SearchBox() {
  const {
    searchRef,
    setResultsBoxOpen,
    textValue,
    setTextValue,
    selectedIdx,
    setSelectedIdx,
    results,
    selectedItems,
    setSelectedItems,
    setKeyboardMode,
  } = useContext(SearchComponentContext);

  function onEnter() {
    setSelectedItems([
      ...selectedItems,
      {
        id: results[selectedIdx].id,
        name: results[selectedIdx].name,
      },
    ]);
    setTextValue('');
    searchRef.current!.focus();
    setResultsBoxOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    setKeyboardMode(true);

    switch (event.key) {
      case 'Enter':
        event.stopPropagation();
        event.preventDefault();
        onEnter();
        break;
      case 'ArrowUp':
        event.stopPropagation();
        event.preventDefault();
        setSelectedIdx((selectedIdx + results.length - 1) % results.length);
        break;
      case 'ArrowDown':
        event.stopPropagation();
        event.preventDefault();
        setSelectedIdx((selectedIdx + 1) % results.length);
        break;
      case 'Escape':
        event.stopPropagation();
        event.preventDefault();
        setResultsBoxOpen(false);
        setSelectedIdx(-1);
        searchRef.current && searchRef.current.blur();
        break;
      case 'Tab':
        event.stopPropagation();
        event.preventDefault();
        setResultsBoxOpen(false);
        break;
      default:
        event.stopPropagation();
    }
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    event.preventDefault();
    event.stopPropagation();
    setKeyboardMode(false);
  }

  return (
    <input
      autoComplete="off"
      onChange={(event) => {
        setTextValue(event.target.value);
      }}
      onFocus={() => {
        setResultsBoxOpen(true);
      }}
      onBlur={() => {
        setTimeout(() => {
          setResultsBoxOpen(false);
          setSelectedIdx(-1);
        }, 200);
      }}
      onKeyDown={(event) => handleKeyDown(event)}
      onKeyUp={(event) => handleKeyUp(event)}
      ref={searchRef}
      type="text"
      value={textValue}
    />
  );
}

export function SearchResults() {
  const { resultsBoxOpen, results } = useContext(SearchComponentContext);
  const SearchResultsRef = useRef(null);

  return (
    <div
      className={cx(
        'absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-gray-300 bg-white',
        (results.length === 0 || !resultsBoxOpen) && 'hidden'
      )}
      ref={SearchResultsRef}
    >
      <ul>
        {results.map((item, idx) => {
          return <SearchResultItem key={item.id} item={item} idx={idx} />;
        })}
      </ul>
    </div>
  );
}

type SearchResultItemType = {
  item: ItemType;
  idx: number;
};

export function SearchResultItem({ item, idx }: SearchResultItemType) {
  const {
    results,
    selectedIdx,
    setSelectedIdx,
    setSelectedItems,
    selectedItems,
    setTextValue,
    searchRef,
    setResultsBoxOpen,
    KeyboardMode,
  } = useContext(SearchComponentContext);

  const ref: MutableRefObject<HTMLLIElement | null> = useRef(null);

  const handleScroll = () => {
    if (ref.current)
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };

  useEffect(() => {
    if (selectedIdx >= 0 && KeyboardMode) {
      handleScroll();
    }
  }, [selectedIdx]);

  function handleClickItem(event: SyntheticEvent<Element, Event>) {
    item.action(event, () => {
      setSelectedItems([
        ...selectedItems,
        {
          id: results[selectedIdx].id,
          name: results[selectedIdx].name,
        },
      ]);
      setTextValue('');
      setSelectedIdx(-1);
      searchRef.current!.blur();
      setResultsBoxOpen(false);
    });
  }

  return (
    <li
      className={cx(
        selectedIdx === idx ? 'bg-green-50' : '',
        'w-full cursor-pointer border-gray-100 px-2 py-3 text-left text-sm'
      )}
      onMouseOver={() => {
        setSelectedIdx(idx);
      }}
      onMouseOut={() => {
        setSelectedIdx(-1);
      }}
      onClick={(event) => handleClickItem(event)}
      id={item.id.toString()}
      ref={selectedIdx === idx ? ref : null}
    >
      <p
        className={cx(
          getPillCn({ color: 'pink-100' }),
          'flex items-center gap-1'
        )}
      >
        {item.name}
      </p>
    </li>
  );
}
