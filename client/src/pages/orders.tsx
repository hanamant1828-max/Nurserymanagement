import { useState, useEffect, useMemo, useRef } from "react";
import { InvoicePrint } from "@/components/invoice-print";
import { generateInvoice } from "@/lib/invoice";
import { Receipt, Printer, Edit2, Plus, ShoppingCart, CheckCircle, Layers, Check, ChevronsUpDown, Loader2, Search, ChevronLeft, ChevronRight, MapPin, Calendar as CalendarIcon, FileSpreadsheet, Truck } from "lucide-react";
import { useOrders, useCreateOrder, useUpdateOrder } from "@/hooks/use-orders";
import { useLots } from "@/hooks/use-lots";
import { useCategories } from "@/hooks/use-categories";
import { useVarieties } from "@/hooks/use-varieties";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import confetti from "canvas-confetti";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const formSchema = z
  .object({
    lotId: z.string().optional(),
    categoryId: z.string().min(1, "Please select a category"),
    varietyId: z.string().min(1, "Please select a variety"),
    customerName: z.string().min(1, "Customer name is required"),
    phone: z.string().min(10, "Valid phone number required"),
    village: z.string().optional(),
    state: z.string().min(1, "State is required"),
    district: z.string().min(1, "District is required"),
    taluk: z.string().min(1, "Taluk is required"),
    bookedQty: z.coerce.number().min(1, "Quantity must be > 0"),
    perUnitPrice: z.coerce.number().min(0, "Price must be >= 0"),
    discount: z.coerce.number().min(0, "Discount must be >= 0").default(0),
    totalAmount: z.coerce.number().min(0, "Total amount is required"),
    advanceAmount: z.coerce.number().min(0),
    paymentMode: z.enum(["Cash", "PhonePe", "UPI", "GPay"]),
    deliveryDate: z.date(),
    sowingDate: z.date().optional(),
    vehicleDetails: z.string().optional(),
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
  })
  .refine((data) => data.advanceAmount <= data.totalAmount, {
    message: "Advance cannot be greater than Total Amount",
    path: ["advanceAmount"],
  });

function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder,
  emptyText = "No results found.",
  disabled = false,
  renderItem,
  searchFields = ["name"],
}: {
  options: any[];
  value: string;
  onValueChange: (val: string) => void;
  placeholder: string;
  emptyText?: string;
  disabled?: boolean;
  renderItem: (item: any) => React.ReactNode;
  searchFields?: string[];
}) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOptions = useMemo(() => {
    if (!options) return [];
    if (!searchQuery) return options;
    const searchLower = searchQuery.toLowerCase();
    return options.filter((option) =>
      searchFields.some((field) => {
        const val = option[field];
        return val != null && val.toString().toLowerCase().includes(searchLower);
      })
    );
  }, [options, searchQuery, searchFields]);

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery("");
    }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 text-left font-normal text-sm"
          disabled={disabled}
        >
          <div className="flex-1 truncate text-left">
            {value ? (
              <div className="flex items-center gap-2">
                {(() => {
                  const selectedOption = options?.find((opt) => opt.id?.toString() === value);
                  return selectedOption ? renderItem(selectedOption) : <span className="text-muted-foreground">{placeholder}</span>;
                })()}
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[calc(100vw-2rem)] sm:w-[--radix-popover-trigger-width] p-0 z-[100]"
        align="start"
        sideOffset={4}
      >
          <Command
            shouldFilter={false}
          >
            <CommandInput
              placeholder={`Search ${placeholder.toLowerCase()}...`}
              autoFocus
              onValueChange={(val) => {
                setSearchQuery(val);
              }}
            />
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.id.toString()}
                  onSelect={() => {
                    onValueChange(option.id.toString());
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="flex items-center justify-between py-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {renderItem(option)}
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === option.id.toString()
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

const MAHARASHTRA_DISTRICTS = [
  {
    name: "Ahmednagar",
    taluks: [
      "Ahmednagar",
      "Akole",
      "Jamkhed",
      "Karjat",
      "Kopargaon",
      "Nevasa",
      "Parner",
      "Pathardi",
      "Rahata",
      "Rahuri",
      "Sangamner",
      "Shevgaon",
      "Shrigonda",
      "Shrirampur",
    ],
  },
  {
    name: "Akola",
    taluks: [
      "Akola",
      "Akot",
      "Balapur",
      "Barshitakli",
      "Murtijapur",
      "Patur",
      "Telhara",
    ],
  },
  {
    name: "Amravati",
    taluks: [
      "Achalpur",
      "Amravati",
      "Anjangaon Surji",
      "Chandur Railway",
      "Chandurbazar",
      "Chikhaldara",
      "Daryapur",
      "Dhamangaon Railway",
      "Dharni",
      "Morshi",
      "Nandgaon Khandeshwar",
      "Teosa",
      "Warud",
    ],
  },
  {
    name: "Aurangabad",
    taluks: [
      "Aurangabad",
      "Paithan",
      "Phulambri",
      "Sillod",
      "Soegaon",
      "Vaijapur",
      "Gangapur",
      "Khultabad",
      "Kannad",
    ],
  },
  {
    name: "Beed",
    taluks: [
      "Beed",
      "Ashti",
      "Gevrai",
      "Ambajogai",
      "Kaij",
      "Parli",
      "Majalgaon",
      "Patoda",
      "Shirur",
      "Wadwani",
      "Dharur",
    ],
  },
  {
    name: "Bhandara",
    taluks: [
      "Bhandara",
      "Tumsar",
      "Pauni",
      "Mohadi",
      "Sakoli",
      "Lakhani",
      "Lakhandur",
    ],
  },
  {
    name: "Buldhana",
    taluks: [
      "Buldhana",
      "Chikhli",
      "Deulgaon Raja",
      "Jalgaon Jamod",
      "Khamgaon",
      "Lonar",
      "Malkapur",
      "Mehekar",
      "Motala",
      "Nandura",
      "Sangrampur",
      "Shegaon",
      "Sindkhed Raja",
    ],
  },
  {
    name: "Chandrapur",
    taluks: [
      "Chandrapur",
      "Bhadravati",
      "Brahmapuri",
      "Chimur",
      "Gondpipri",
      "Jiwati",
      "Korpana",
      "Mul",
      "Nagbhir",
      "Pombhurna",
      "Rajura",
      "Sawali",
      "Sindewahi",
      "Warora",
      "Ballarpur",
    ],
  },
  { name: "Dhule", taluks: ["Dhule", "Sakri", "Sindkheda", "Shirpur"] },
  {
    name: "Gadchiroli",
    taluks: [
      "Gadchiroli",
      "Dhanora",
      "Chamorshi",
      "Mulchera",
      "Desaiganj",
      "Armori",
      "Kurkheda",
      "Korchi",
      "Aheri",
      "Etapalli",
      "Bhamragad",
      "Sironcha",
    ],
  },
  {
    name: "Gondia",
    taluks: [
      "Gondia",
      "Arjuni Morgaon",
      "Deori",
      "Sadak Arjuni",
      "Salekasa",
      "Amgaon",
      "Goregaon",
      "Tirora",
    ],
  },
  {
    name: "Hingoli",
    taluks: ["Hingoli", "Sengon", "Kalumnuri", "Basmath", "Aundha Nagnath"],
  },
  {
    name: "Jalgaon",
    taluks: [
      "Jalgaon",
      "Jamner",
      "Erandol",
      "Dharangaon",
      "Bhadgaon",
      "Chalisgaon",
      "Pachora",
      "Parola",
      "Bodwad",
      "Yawal",
      "Raver",
      "Muktainagar",
      "Amalner",
      "Chopda",
      "Bhusawal",
    ],
  },
  {
    name: "Jalna",
    taluks: [
      "Jalna",
      "Badnapur",
      "Bhokardan",
      "Jafrabad",
      "Ambad",
      "Ghansawangi",
      "Partur",
      "Mantha",
    ],
  },
  {
    name: "Kolhapur",
    taluks: [
      "Karvir",
      "Panhala",
      "Shahuwadi",
      "Kagal",
      "Hatkanangle",
      "Shirol",
      "Radhanagari",
      "Gaganbawada",
      "Bhudaragad",
      "Ajara",
      "Gadhinglaj",
      "Chandgad",
    ],
  },
  {
    name: "Latur",
    taluks: [
      "Latur",
      "Udgir",
      "Ahmedpur",
      "Ausa",
      "Nilanga",
      "Renapur",
      "Chakur",
      "Deoni",
      "Shirur Anantpal",
      "Jalkot",
    ],
  },
  { name: "Mumbai City", taluks: ["Mumbai City"] },
  { name: "Mumbai Suburban", taluks: ["Kurla", "Andheri", "Borivali"] },
  {
    name: "Nagpur",
    taluks: [
      "Nagpur Urban",
      "Nagpur Rural",
      "Kamptee",
      "Hingna",
      "Katol",
      "Narkhed",
      "Savner",
      "Kalmeshwar",
      "Ramtek",
      "Mouda",
      "Kuhi",
      "Bhiwapur",
      "Umred",
      "Parseoni",
    ],
  },
  {
    name: "Nanded",
    taluks: [
      "Nanded",
      "Ardhapur",
      "Mudkhed",
      "Bhokar",
      "Umri",
      "Loha",
      "Kandhar",
      "Kinwat",
      "Himayatnagar",
      "Hadgaon",
      "Mahur",
      "Deglur",
      "Mukhed",
      "Dharmabad",
      "Biloli",
      "Naigaon",
    ],
  },
  {
    name: "Nandurbar",
    taluks: [
      "Nandurbar",
      "Navapur",
      "Shahada",
      "Taloda",
      "Akkalkuwa",
      "Akrani",
    ],
  },
  {
    name: "Nashik",
    taluks: [
      "Nashik",
      "Sinnar",
      "Igatpuri",
      "Trimbakeshwar",
      "Niphad",
      "Yeola",
      "Chandwad",
      "Nandgaon",
      "Kalwan",
      "Baglan",
      "Surgana",
      "Peint",
      "Dindori",
      "Deola",
      "Malegaon",
    ],
  },
  {
    name: "Osmanabad",
    taluks: [
      "Osmanabad",
      "Tuljapur",
      "Omerga",
      "Lohara",
      "Kalamb",
      "Bhum",
      "Paranda",
      "Washi",
    ],
  },
  {
    name: "Palghar",
    taluks: [
      "Palghar",
      "Vada",
      "Talasari",
      "Jawhar",
      "Mokhada",
      "Dahanu",
      "Vikramgad",
      "Vasai",
    ],
  },
  {
    name: "Parbhani",
    taluks: [
      "Parbhani",
      "Jintur",
      "Sailu",
      "Manwath",
      "Pathri",
      "Sonpeth",
      "Gangakhed",
      "Palam",
      "Purna",
    ],
  },
  {
    name: "Pune",
    taluks: [
      "Pune City",
      "Haveli",
      "Khed",
      "Ambegaon",
      "Junner",
      "Shirur",
      "Daund",
      "Indapur",
      "Baramati",
      "Purandar",
      "Bhor",
      "Velhe",
      "Mawal",
      "Mulshi",
    ],
  },
  {
    name: "Raigad",
    taluks: [
      "Alibag",
      "Pen",
      "Murud",
      "Panvel",
      "Uran",
      "Karjat",
      "Khalapur",
      "Mangaon",
      "Tala",
      "Roha",
      "Sudhagad",
      "Mahad",
      "Poladpur",
      "Shrivardhan",
      "Mhasla",
    ],
  },
  {
    name: "Ratnagiri",
    taluks: [
      "Ratnagiri",
      "Sangameshwar",
      "Lanja",
      "Rajapur",
      "Chiplun",
      "Guhagar",
      "Dapoli",
      "Mandangad",
      "Khed",
    ],
  },
  {
    name: "Sangli",
    taluks: [
      "Miraj",
      "Tasgaon",
      "Khanapur-Vita",
      "Valva-Islampur",
      "Shirala",
      "Atpadi",
      "Kavathe-Mahankal",
      "Jat",
      "Kadegaon",
      "Palus",
    ],
  },
  {
    name: "Satara",
    taluks: [
      "Satara",
      "Wai",
      "Jawali",
      "Koregaon",
      "Karad",
      "Patan",
      "Mahabaleshwar",
      "Khandala",
      "Khatav",
      "Phaltan",
      "Maun",
    ],
  },
  {
    name: "Sindhudurg",
    taluks: [
      "Sawantwadi",
      "Kudal",
      "Vengurla",
      "Malvan",
      "Devgad",
      "Kankavli",
      "Vaibhavwadi",
      "Dodamarg",
    ],
  },
  {
    name: "Solapur",
    taluks: [
      "North Solapur",
      "South Solapur",
      "Akkalkot",
      "Barshi",
      "Mangalwedha",
      "Pandharpur",
      "Sangola",
      "Madha",
      "Karmala",
      "Mohol",
      "Malshiras",
    ],
  },
  {
    name: "Thane",
    taluks: [
      "Thane",
      "Kalyan",
      "Murbad",
      "Bhiwandi",
      "Shahapur",
      "Ulhasnagar",
      "Ambarnath",
    ],
  },
  {
    name: "Wardha",
    taluks: [
      "Wardha",
      "Deoli",
      "Seloo",
      "Arvi",
      "Ashti",
      "Karanja",
      "Hinganghat",
      "Samudrapur",
    ],
  },
  {
    name: "Washim",
    taluks: ["Washim", "Risod", "Malegaon", "Mangrulpir", "Karanja", "Manora"],
  },
  {
    name: "Yavatmal",
    taluks: [
      "Yavatmal",
      "Babulgaon",
      "Kalamb",
      "Darwha",
      "Digras",
      "Arni",
      "Ner",
      "Pusad",
      "Umarkhed",
      "Mahagaon",
      "Kelapur",
      "Ghatanji",
      "Pandharkawada",
      "Zari Jamni",
      "Wani",
      "Maregaon",
      "Ralegaon",
    ],
  },
];

const KARNATAKA_DISTRICTS = [
  {
    name: "Bagalkot",
    taluks: [
      "Bagalkot",
      "Badami",
      "Bilgi",
      "Hungund",
      "Jamkhandi",
      "Mudhol",
      "Ilkal",
      "Rabkavi Banhatti",
      "Guledgudda",
    ],
  },
  {
    name: "Ballari",
    taluks: [
      "Ballari",
      "Hosapete",
      "Kampli",
      "Hoovina Hadagali",
      "Kudligi",
      "Sandur",
      "Siruguppa",
      "Kurugodu",
      "Kotturu",
    ],
  },
  {
    name: "Belagavi",
    taluks: [
      "Belagavi",
      "Athani",
      "Bailhongal",
      "Chikkodi",
      "Gokak",
      "Hukkeri",
      "Khanapur",
      "Ramdurg",
      "Saundatti",
      "Raybag",
      "Kittur",
      "Nippani",
      "Kagwad",
      "Mudalgi",
    ],
  },
  {
    name: "Bengaluru Rural",
    taluks: ["Devanahalli", "Doddaballapura", "Hoskote", "Nelamangala"],
  },
  {
    name: "Bengaluru Urban",
    taluks: [
      "Bengaluru North",
      "Bengaluru South",
      "Bengaluru East",
      "Yelahanka",
      "Anekal",
    ],
  },
  {
    name: "Bidar",
    taluks: [
      "Bidar",
      "Basavakalyan",
      "Bhalki",
      "Homnabad",
      "Aurad",
      "Chitgoppa",
      "Kamalnagar",
      "Hulsoor",
    ],
  },
  {
    name: "Chamarajanagar",
    taluks: ["Chamarajanagar", "Gundlupet", "Kollegal", "Yelandur", "Hanur"],
  },
  {
    name: "Chikkaballapur",
    taluks: [
      "Chikkaballapur",
      "Bagepalli",
      "Chintamani",
      "Gauribidanur",
      "Gudibanda",
      "Sidlaghatta",
    ],
  },
  {
    name: "Chikkamagaluru",
    taluks: [
      "Chikkamagaluru",
      "Kadur",
      "Koppa",
      "Mudigere",
      "Narasimharajapura",
      "Sringeri",
      "Tarikere",
      "Ajjampura",
    ],
  },
  {
    name: "Chitradurga",
    taluks: [
      "Chitradurga",
      "Challakere",
      "Hiriyur",
      "Holalkere",
      "Hosadurga",
      "Molakalmuru",
    ],
  },
  {
    name: "Dakshina Kannada",
    taluks: [
      "Mangaluru",
      "Bantwal",
      "Beltangadi",
      "Puttur",
      "Sullia",
      "Moodabidri",
      "Kadaba",
    ],
  },
  {
    name: "Davanagere",
    taluks: ["Davanagere", "Harihar", "Channagiri", "Honnali", "Jagalur"],
  },
  {
    name: "Dharwad",
    taluks: [
      "Dharwad",
      "Hubballi",
      "Hubballi City",
      "Kalghatgi",
      "Navalgund",
      "Kundgol",
      "Alnavar",
      "Annigeri",
    ],
  },
  {
    name: "Gadag",
    taluks: [
      "Gadag-Betageri",
      "Mundargi",
      "Nargund",
      "Ron",
      "Shirahatti",
      "Gajendragad",
      "Lakshmeshwar",
    ],
  },
  {
    name: "Hassan",
    taluks: [
      "Hassan",
      "Arasikere",
      "Arkalgud",
      "Belur",
      "Channarayapatna",
      "Holonarasipura",
      "Sakleshpur",
      "Alur",
    ],
  },
  {
    name: "Haveri",
    taluks: [
      "Haveri",
      "Byadgi",
      "Hangal",
      "Hirekerur",
      "Ranebennur",
      "Savanur",
      "Shiggaon",
      "Rattihalli",
    ],
  },
  {
    name: "Kalaburagi",
    taluks: [
      "Kalaburagi",
      "Afzalpur",
      "Aland",
      "Chincholi",
      "Chitapur",
      "Jevargi",
      "Sedam",
      "Shahabad",
      "Kalagi",
      "Kamalapura",
      "Yedrami",
    ],
  },
  {
    name: "Kodagu",
    taluks: ["Madikeri", "Somwarpet", "Virajpet", "Kushalnagar", "Ponnampet"],
  },
  {
    name: "Kolar",
    taluks: [
      "Kolar",
      "Bangarapet",
      "Malur",
      "Mulbagal",
      "Srinivaspur",
      "Kolar Gold Fields",
    ],
  },
  {
    name: "Koppal",
    taluks: [
      "Koppal",
      "Gangavathi",
      "Kushtagi",
      "Yelbarga",
      "Kanakagiri",
      "Karatagi",
      "Kukanoor",
    ],
  },
  {
    name: "Mandya",
    taluks: [
      "Mandya",
      "Maddur",
      "Malavalli",
      "Srirangapatna",
      "Nagamangala",
      "Krishnarajapet",
      "Pandavapura",
    ],
  },
  {
    name: "Mysuru",
    taluks: [
      "Mysuru",
      "Hunsur",
      "Krishnarajanagara",
      "Nanjanagudu",
      "Piriyapatna",
      "T.Narsipura",
      "Sargur",
      "Saligrama",
    ],
  },
  {
    name: "Raichur",
    taluks: [
      "Raichur",
      "Devadurga",
      "Lingsugur",
      "Manvi",
      "Sindhanur",
      "Maski",
      "Sirwar",
    ],
  },
  {
    name: "Ramanagara",
    taluks: ["Ramanagara", "Channapatna", "Kanakapura", "Magadi"],
  },
];

const DISTRICTS_DATA: Record<string, any[]> = {
  Maharashtra: MAHARASHTRA_DISTRICTS,
  Karnataka: KARNATAKA_DISTRICTS,
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>("deliveryDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const { data: ordersData, isLoading } = useOrders(page, limit, sortField, sortOrder);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronRight className="ml-2 h-4 w-4 -rotate-90 transition-transform" />
    ) : (
      <ChevronRight className="ml-2 h-4 w-4 rotate-90 transition-transform" />
    );
  };

  const [printingOrder, setPrintingOrder] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = (order: any) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / limit);

  const { data: lots } = useLots();
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  const PERSISTENCE_KEY = "orders_filters_state";

  const getInitialState = () => {
    const saved = localStorage.getItem(PERSISTENCE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          search: parsed.search || "",
          pageCategoryId: parsed.pageCategoryId || "all",
          pageVarietyId: parsed.pageVarietyId || "all",
          pageLotId: parsed.pageLotId || "all",
          dateRange: {
            from: parsed.dateRange?.from ? new Date(parsed.dateRange.from) : new Date(new Date().setDate(new Date().getDate() - 30)),
            to: parsed.dateRange?.to ? new Date(parsed.dateRange.to) : new Date(new Date().setDate(new Date().getDate() + 30)),
          },
          currentPage: parsed.currentPage || 1,
        };
      } catch (e) {
        console.error("Failed to parse saved filters", e);
      }
    }
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    return {
      search: "",
      pageCategoryId: "all",
      pageVarietyId: "all",
      pageLotId: "all",
      dateRange: { from, to },
      currentPage: 1,
    };
  };

  const initialState = getInitialState();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedVarietyId, setSelectedVarietyId] = useState<string | null>(null);
  const [search, setSearch] = useState(initialState.search);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const itemsPerPage = 10000;

  const [pageCategoryId, setPageCategoryId] = useState<string>(initialState.pageCategoryId);
  const [pageVarietyId, setPageVarietyId] = useState<string>(initialState.pageVarietyId);
  const [pageLotId, setPageLotId] = useState<string>(initialState.pageLotId);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(initialState.dateRange);

  const filteredOrdersList = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o: any) => {
      const deliveryDate = new Date(o.deliveryDate);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      const isWithinDateRange = deliveryDate >= fromDate && deliveryDate <= toDate;
      if (!isWithinDateRange) return false;

      const matchesCategory = pageCategoryId === "all" || o.lot?.categoryId?.toString() === pageCategoryId;
      if (!matchesCategory) return false;

      const matchesVariety = pageVarietyId === "all" || o.lot?.varietyId?.toString() === pageVarietyId;
      if (!matchesVariety) return false;

      const matchesLot = pageLotId === "all" || o.lotId?.toString() === pageLotId;
      if (!matchesLot) return false;

      const matchesSearch = !search || 
        o.customerName?.toLowerCase().includes(search.toLowerCase()) || 
        o.phone?.toLowerCase().includes(search.toLowerCase()) ||
        o.village?.toLowerCase().includes(search.toLowerCase()) ||
        o.lotId?.toString().includes(search) ||
        o.lot?.lotNumber?.toLowerCase().includes(search.toLowerCase());
      
      return matchesSearch;
    });
  }, [orders, search, dateRange, pageCategoryId, pageVarietyId, pageLotId]);

  const [sortOption, setSortOption] = useState<string>("delivery-newest");

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrdersList];
    return list.sort((a, b) => {
      if (sortOption === "ready-newest") {
        return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
      }
      if (sortOption === "ready-oldest") {
        return new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime();
      }
      if (sortOption === "delivery-newest") {
        return new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime();
      }
      return 0;
    });
  }, [filteredOrdersList, sortOption]);

  const paginatedOrders = sortedOrders;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      categoryId: "",
      varietyId: "",
      customerName: "",
      phone: "",
      state: "",
      district: "",
      taluk: "",
      bookedQty: 1,
      perUnitPrice: 0,
      totalAmount: 0,
      advanceAmount: 0,
      paymentMode: "Cash",
      deliveryDate: new Date(),
    },
  });

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("Form Errors:", form.formState.errors);
    }
  }, [form.formState.errors]);

  const { mutate: create, isPending: createLoading } = useCreateOrder();
  const { mutate: update, isPending: updateLoading } = useUpdateOrder();
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<any>(null);

  const deliveryFormSchema = z.object({
    actualDeliveryDate: z.date(),
    actualDeliveryTime: z.string().min(1, "Time is required"),
    deliveredQty: z.coerce.number().min(1, "Quantity must be > 0"),
    vehicleDetails: z.string().optional(),
    driverName: z.string().optional(),
    driverPhone: z.string().optional(),
  });

  const deliveryForm = useForm({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      actualDeliveryDate: new Date(),
      actualDeliveryTime: format(new Date(), "HH:mm"),
      deliveredQty: 0,
      vehicleDetails: "",
      driverName: "",
      driverPhone: "",
    },
  });

  const onDeliverSubmit = async (data: any) => {
    if (!selectedOrderForDelivery) return;
    try {
      const { apiRequest } = await import("@/lib/queryClient");
      const { queryClient } = await import("@/lib/queryClient");
      await apiRequest("POST", `/api/orders/${selectedOrderForDelivery.id}/deliver`, {
        ...data,
        actualDeliveryDate: format(data.actualDeliveryDate, "yyyy-MM-dd"),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setDeliveryDialogOpen(false);
      toast({ title: "Success", description: "Order marked as delivered" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to mark as delivered", variant: "destructive" });
    }
  };

  const selectedLotId = form.watch("lotId");
  const selectedLot = lots?.find((l) => l.id.toString() === selectedLotId);
  const totalAmountValue = form.watch("totalAmount") || 0;
  const advanceAmountValue = form.watch("advanceAmount") || 0;
  const remainingBalance = totalAmountValue - advanceAmountValue;
  const paymentStatus = advanceAmountValue === 0 ? "Pending" : advanceAmountValue < totalAmountValue ? "Partially Paid" : "Paid";

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const checkPhone = async (phone: string) => {
    if (phone.length < 10) return;
    setIsSearchingPhone(true);
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phone}`, { credentials: "include" });
      if (res.ok) {
        const customer = await res.json();
        if (customer) {
          form.setValue("customerName", customer.customerName);
          form.setValue("state", customer.state || "");
          form.setValue("district", customer.district || "");
          form.setValue("taluk", customer.taluk || "");
          form.setValue("village", customer.village || "");
        }
      }
    } catch (error) {
      console.error("Error looking up customer:", error);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  const markDelivered = (id: number) => {
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    const now = new Date();
    update({
      id,
      status: "DELIVERED",
      deliveredQty: "0",
      actualDeliveryDate: format(now, "yyyy-MM-dd"),
      actualDeliveryTime: format(now, "HH:mm:ss"),
    });
  };

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const payload: any = {
      categoryId: selectedCategoryId ? parseInt(selectedCategoryId) : (data.categoryId ? parseInt(data.categoryId) : null),
      varietyId: selectedVarietyId ? parseInt(selectedVarietyId) : (data.varietyId ? parseInt(data.varietyId) : null),
      lotId: data.lotId ? parseInt(data.lotId) : (selectedLotId ? parseInt(selectedLotId) : null),
      customerName: data.customerName,
      phone: data.phone,
      village: data.village || null,
      state: data.state,
      district: data.district,
      taluk: data.taluk,
      perUnitPrice: data.perUnitPrice.toString(),
      bookedQty: data.bookedQty.toString(),
      allocatedQuantity: "0",
      pendingQuantity: data.bookedQty.toString(),
      lotStatus: "PENDING_LOT",
      discount: data.discount.toString(),
      totalAmount: data.totalAmount.toString(),
      advanceAmount: data.advanceAmount.toString(),
      remainingBalance: remainingBalance.toString(),
      paymentMode: data.paymentMode,
      deliveryDate: format(data.deliveryDate, "yyyy-MM-dd"),
      status: "BOOKED",
      paymentStatus,
      sowingDate: data.sowingDate ? format(data.sowingDate, "yyyy-MM-dd") : null,
      vehicleDetails: data.vehicleDetails || null,
      driverName: data.driverName || null,
      driverPhone: data.driverPhone || null,
    };

    console.log("Submitting order payload:", payload);

    if (editingOrder) {
      console.log("Calling update mutation for order:", editingOrder.id);
      update({ id: editingOrder.id, ...payload }, {
        onSuccess: () => {
          console.log("Order updated successfully");
          setOpen(false);
          setEditingOrder(null);
          form.reset();
          setStep(1);
          setSelectedCategoryId(null);
          setSelectedVarietyId(null);
          toast({
            title: "Success",
            description: "Order updated successfully",
          });
        },
        onError: (error: any) => {
          console.error("Update error:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to update order",
            variant: "destructive",
          });
        }
      });
    } else {
      console.log("Calling create mutation");
      create(payload, {
        onSuccess: (newOrder) => {
          console.log("Order created successfully:", newOrder);
          setOpen(false);
          form.reset();
          setStep(1);
          setSelectedCategoryId(null);
          setSelectedVarietyId(null);
          toast({
            title: "Success",
            description: "Order booked successfully",
          });
        },
        onError: (error: any) => {
          console.error("Create error:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to book order",
            variant: "destructive",
          });
        }
      });
    }
  };

  const nextStep = () => setStep((s) => s + 1);
  const prevStep = () => setStep((s) => s - 1);

  if (isLoading) return <Skeleton className="h-screen w-full" />;

  return (
    <div className="space-y-6 px-4 md:px-8 py-6">
      {printingOrder && <div id="invoice-print" className="hidden print:block"><InvoicePrint order={printingOrder} /></div>}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Orders ({filteredOrdersList.length})</h1>
          <p className="text-sm text-muted-foreground">Book new orders and manage deliveries.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="flex-1 sm:flex-none">
            <Loader2 className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" /> 
            Book Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">From Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-10 px-3">
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{dateRange.from ? format(dateRange.from, "MMM do, yyyy") : "Pick a date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">To Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-left font-normal h-10 px-3">
                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">{dateRange.to ? format(dateRange.to, "MMM do, yyyy") : "Pick a date"}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">Category</label>
          <Select value={pageCategoryId} onValueChange={setPageCategoryId}>
            <SelectTrigger className="h-10 px-3">
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-4 w-4 text-green-600 shrink-0" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat: any) => (
                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium uppercase text-muted-foreground">Variety</label>
          <Select value={pageVarietyId} onValueChange={setPageVarietyId}>
            <SelectTrigger className="h-10 px-3">
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-4 w-4 text-green-600 shrink-0" />
                <SelectValue placeholder="All Varieties" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Varieties</SelectItem>
              {varieties?.filter(v => pageCategoryId === "all" || v.categoryId?.toString() === pageCategoryId).map((v: any) => (
                <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-medium uppercase text-muted-foreground">Lot</label>
          <Select value={pageLotId} onValueChange={setPageLotId}>
            <SelectTrigger className="h-10 px-3">
              <div className="flex items-center gap-2 truncate">
                <Layers className="h-4 w-4 text-green-600 shrink-0" />
                <SelectValue placeholder="All Lots" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Lots</SelectItem>
              {lots?.filter(l => (pageCategoryId === "all" || l.categoryId?.toString() === pageCategoryId) && (pageVarietyId === "all" || l.varietyId?.toString() === pageVarietyId)).map((l: any) => (
                <SelectItem key={l.id} value={l.id.toString()}>Lot {l.lotNumber} - {l.variety?.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search customer, phone, village..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 w-full"
          />
        </div>
        <Select value={sortOption} onValueChange={setSortOption}>
          <SelectTrigger className="w-full sm:w-[220px] h-10">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="delivery-newest">Delivery Date (Newest)</SelectItem>
            <SelectItem value="delivery-oldest">Delivery Date (Oldest)</SelectItem>
            <SelectItem value="ready-newest">Ready Date (Newest)</SelectItem>
            <SelectItem value="ready-oldest">Ready Date (Oldest)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <div className="font-bold">{order.customerName}</div>
                    <div className="text-xs text-muted-foreground">{order.phone}</div>
                  </TableCell>
                  <TableCell>
                    {order.lotId ? (
                      <Badge variant="outline">
                        {order.lot?.lotNumber}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="bg-red-500 hover:bg-red-600">
                        Lot Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{Number(order.bookedQty).toLocaleString()}</span>
                      {order.lotStatus !== "PENDING_LOT" && (
                        <span className="text-xs text-muted-foreground">
                          Allocated: {Number(order.allocatedQuantity).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.status === "DELIVERED" ? "default" : "outline"}>{order.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="icon" onClick={() => handlePrint(order)} className="h-8 w-8" title="Print Invoice"><Printer className="h-4 w-4 text-primary" /></Button>
                      {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => {
                            setSelectedOrderForDelivery(order);
                            deliveryForm.reset({
                              actualDeliveryDate: new Date(),
                              actualDeliveryTime: format(new Date(), "HH:mm"),
                              deliveredQty: Number(order.bookedQty),
                              vehicleDetails: order.vehicleDetails || "",
                              driverName: order.driverName || "",
                              driverPhone: order.driverPhone || "",
                            });
                            setDeliveryDialogOpen(true);
                          }} 
                          className="h-8 w-8 text-green-600 border-green-200 hover:bg-green-50"
                          title="Mark as Delivered"
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="outline" size="icon" onClick={() => {
                        setPrintingOrder(order);
                        setTimeout(() => generateInvoice(order), 100);
                      }} className="h-8 w-8"><FileSpreadsheet className="h-4 w-4 text-green-600" /></Button>
                      <Button variant="outline" size="icon" onClick={() => { 
                        const bookingData = {
                          ...order,
                          categoryId: order.categoryId?.toString() || order.lot?.categoryId?.toString(),
                          varietyId: order.varietyId?.toString() || order.lot?.varietyId?.toString(),
                          lotId: order.lotId?.toString() || "",
                          deliveryDate: new Date(order.deliveryDate),
                          bookedQty: Number(order.bookedQty),
                          perUnitPrice: Number(order.perUnitPrice),
                          totalAmount: Number(order.totalAmount),
                          advanceAmount: Number(order.advanceAmount),
                          discount: Number(order.discount || 0),
                        };
                        setEditingOrder(order);
                        setSelectedCategoryId(bookingData.categoryId);
                        setSelectedVarietyId(bookingData.varietyId);
                        form.reset(bookingData);
                        setStep(4); // Go directly to details step
                        setOpen(true); 
                      }} className="h-8 w-8">
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="md:hidden space-y-4">
          {paginatedOrders.map((order: any) => (
            <div key={order.id} className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate">{order.customerName}</h3>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{order.phone}</p>
                </div>
                <Badge variant={order.status === "DELIVERED" ? "default" : "outline"} className="shrink-0">
                  {order.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Lot Details</p>
                  {order.lotId ? (
                    <div className="flex flex-col gap-0.5 mt-1">
                      <Badge variant="outline" className="w-fit bg-green-50/50 dark:bg-green-900/10 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 py-0 h-5">
                        {order.lot?.lotNumber}
                      </Badge>
                      <span className="text-xs font-medium truncate">{order.lot?.variety?.name}</span>
                    </div>
                  ) : (
                    <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200 dark:border-red-900 py-0 h-5 mt-1">
                      Lot Pending
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Quantity</p>
                  <p className="font-bold text-lg text-primary">{Number(order.bookedQty).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Location</p>
                  <p className="truncate text-xs">{order.village ? `${order.village}, ` : ""}{order.taluk}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[10px] uppercase font-bold tracking-wider">Delivery Date</p>
                  <p className="text-xs font-medium">{format(new Date(order.deliveryDate), "MMM d, yyyy")}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => handlePrint(order)} className="flex-1 h-9">
                  <Printer className="h-4 w-4 mr-2 text-primary" /> Print
                </Button>
                {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSelectedOrderForDelivery(order);
                      deliveryForm.reset({
                        actualDeliveryDate: new Date(),
                        actualDeliveryTime: format(new Date(), "HH:mm"),
                        deliveredQty: Number(order.bookedQty),
                        vehicleDetails: order.vehicleDetails || "",
                        driverName: order.driverName || "",
                        driverPhone: order.driverPhone || "",
                      });
                      setDeliveryDialogOpen(true);
                    }} 
                    className="flex-1 h-9 text-green-600 border-green-200"
                  >
                    <Truck className="h-4 w-4 mr-2" /> Deliver
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => {
                  setPrintingOrder(order);
                  setTimeout(() => generateInvoice(order), 100);
                }} className="flex-1 h-9">
                  <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => { 
                  const bookingData = {
                    ...order,
                    categoryId: order.categoryId?.toString() || order.lot?.categoryId?.toString(),
                    varietyId: order.varietyId?.toString() || order.lot?.varietyId?.toString(),
                    lotId: order.lotId?.toString() || "",
                    deliveryDate: new Date(order.deliveryDate),
                    bookedQty: Number(order.bookedQty),
                    perUnitPrice: Number(order.perUnitPrice),
                    totalAmount: Number(order.totalAmount),
                    advanceAmount: Number(order.advanceAmount),
                    discount: Number(order.discount || 0),
                  };
                  setEditingOrder(order);
                  setSelectedCategoryId(bookingData.categoryId);
                  setSelectedVarietyId(bookingData.varietyId);
                  form.reset(bookingData);
                  setStep(4); // Go directly to details step
                  setOpen(true);
                }} className="h-9 w-9 p-0">
                  <Edit2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))}
          {paginatedOrders.length === 0 && (
            <div className="p-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Search className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No orders found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page:</span>
          <Select value={limit.toString()} onValueChange={(val) => {
            setLimit(parseInt(val));
            setPage(1);
          }}>
            <SelectTrigger className="w-[80px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* The booking dialog would go here - simplified for space */}
      <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
          setStep(1);
          setSelectedCategoryId(null);
          setSelectedVarietyId(null);
          form.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingOrder ? "Edit Order" : "Book New Order"} - Step {step} of 4
            </DialogTitle>
            <DialogDescription>
              {editingOrder ? "Update existing order details and delivery status." : "Complete the 4-step process to book a new plant order."}
            </DialogDescription>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Select Category</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {categories?.map((cat: any) => (
                  <Card 
                    key={cat.id} 
                    className={cn(
                      "cursor-pointer hover-elevate transition-all border-2",
                      selectedCategoryId === cat.id.toString() ? "border-green-600 bg-green-50/50" : "border-transparent"
                    )}
                    onClick={() => {
                      setSelectedCategoryId(cat.id.toString());
                      form.setValue("categoryId", cat.id.toString());
                      setStep(2);
                    }}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                      {cat.image ? (
                        <img src={cat.image} alt={cat.name} className="w-16 h-16 object-cover rounded-md" />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          <Layers className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{cat.name}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-medium">Select Variety</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {varieties
                  ?.filter((v: any) => v.categoryId.toString() === selectedCategoryId)
                  .map((v: any) => (
                    <Card 
                      key={v.id} 
                      className={cn(
                        "cursor-pointer hover-elevate transition-all border-2",
                        selectedVarietyId === v.id.toString() ? "border-green-600 bg-green-50/50" : "border-transparent"
                      )}
                      onClick={() => {
                        setSelectedVarietyId(v.id.toString());
                        form.setValue("varietyId", v.id.toString());
                        setStep(3);
                      }}
                    >
                      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                        <span className="font-medium">{v.name}</span>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={prevStep}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-lg font-medium">Select Lot</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card 
                  className={cn(
                    "cursor-pointer hover-elevate transition-all border-2 flex items-center justify-center min-h-[100px]",
                    !form.watch("lotId") ? "border-red-500 bg-red-50/50" : "border-transparent"
                  )}
                  onClick={() => {
                    form.setValue("lotId", "");
                    setStep(4);
                  }}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
                    <ShoppingCart className="h-8 w-8 text-red-500" />
                    <span className="font-bold text-red-600 text-lg uppercase">Book without Lot</span>
                    <span className="text-xs text-muted-foreground italic">(Auto-allocates when lot created)</span>
                  </CardContent>
                </Card>
                {lots
                  ?.filter((l: any) => l.varietyId.toString() === selectedVarietyId)
                  .map((l: any) => (
                    <Card 
                      key={l.id} 
                      className={cn(
                        "cursor-pointer hover-elevate transition-all border-2",
                        form.watch("lotId") === l.id.toString() ? "border-green-600 bg-green-50/50" : "border-transparent"
                      )}
                      onClick={() => {
                        form.setValue("lotId", l.id.toString());
                        setStep(4);
                      }}
                    >
                      <CardContent className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-lg">Lot {l.lotNumber}</span>
                          <Badge variant="outline">Stock: {l.seedsSown - l.damaged}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Sown: {format(parseISO(l.sowingDate), "dd MMM yyyy")}
                        </div>
                        {l.expectedReadyDate && (
                          <div className="text-sm text-green-600 font-medium">
                            Expected Ready: {format(parseISO(l.expectedReadyDate), "dd MMM yyyy")}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" type="button" onClick={prevStep}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="text-lg font-medium">Order Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customer Info Section */}
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Customer Information
                      </h4>
                      
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  placeholder="10-digit mobile number" 
                                  {...field} 
                                  onChange={(e) => {
                                    field.onChange(e);
                                    checkPhone(e.target.value);
                                  }}
                                />
                                {isSearchingPhone && (
                                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter customer name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                                  <SelectItem value="Karnataka">Karnataka</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>District</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!form.watch("state")}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select district" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {form.watch("state") && DISTRICTS_DATA[form.watch("state")!]?.map((d: any) => (
                                    <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taluk"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Taluk</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                value={field.value}
                                disabled={!form.watch("district")}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select taluk" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {form.watch("district") && DISTRICTS_DATA[form.watch("state")!]
                                    ?.find((d: any) => d.name === form.watch("district"))
                                    ?.taluks.map((t: string) => (
                                      <SelectItem key={t} value={t}>{t}</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="village"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Village</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter village" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Order Info Section */}
                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg bg-green-50/30 space-y-4">
                      <h4 className="font-semibold text-sm uppercase tracking-wider text-green-700 flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" /> Pricing & Delivery
                      </h4>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bookedQty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => {
                                    const qty = parseFloat(e.target.value) || 0;
                                    field.onChange(qty);
                                    const price = form.getValues("perUnitPrice") || 0;
                                    form.setValue("totalAmount", qty * price);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="perUnitPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price (₹)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  {...field} 
                                  onChange={(e) => {
                                    const price = parseFloat(e.target.value) || 0;
                                    field.onChange(price);
                                    const qty = form.getValues("bookedQty") || 0;
                                    form.setValue("totalAmount", qty * price);
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="totalAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Total Amount (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} readOnly className="bg-muted" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="advanceAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Advance Paid (₹)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-between items-center p-3 bg-white rounded border border-green-100">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Balance:</span>
                          <span className="ml-2 font-bold text-red-600">₹{remainingBalance}</span>
                        </div>
                        <Badge variant={paymentStatus === "Paid" ? "default" : "outline"}>
                          {paymentStatus}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="paymentMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Payment Mode</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Mode" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {["Cash", "PhonePe", "UPI", "GPay"].map(mode => (
                                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="deliveryDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="mb-2">Delivery Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant={"outline"}
                                      className={cn(
                                        "w-full pl-3 text-left font-normal h-10",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value ? (
                                        format(field.value, "PPP")
                                      ) : (
                                        <span>Pick a date</span>
                                      )}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                          <FormField
                            control={form.control}
                            name="sowingDate"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel className="text-sm font-semibold text-primary">Sowing Date (Required for New Sowing)</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full h-10 pl-3 text-left font-normal text-sm border-primary/50 bg-primary/5",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(field.value, "PPP")
                                        ) : (
                                          <span>Pick sowing date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0 z-[110]" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value}
                                      onSelect={field.onChange}
                                      disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                      </div>

                      <div className="p-4 border rounded-lg bg-blue-50/30 space-y-4">
                        <h4 className="font-semibold text-sm uppercase tracking-wider text-blue-700 flex items-center gap-2">
                          <MapPin className="h-4 w-4" /> Vehicle & Driver Details
                        </h4>
                        
                        <FormField
                          control={form.control}
                          name="vehicleDetails"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vehicle Number / Details</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g. MH 12 AB 1234" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="driverName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Driver Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="driverPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Driver Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="Phone" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" type="button" className="flex-1 h-11" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createLoading || updateLoading} className="flex-1 h-11 bg-green-600 hover:bg-green-700">
                    {(createLoading || updateLoading) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    {editingOrder ? "Update Order" : "Confirm Booking"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
      {/* Delivery Dialog */}
      <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Delivered</DialogTitle>
            <DialogDescription>
              Enter delivery details for {selectedOrderForDelivery?.customerName}
            </DialogDescription>
          </DialogHeader>
          <Form {...deliveryForm}>
            <form onSubmit={deliveryForm.handleSubmit(onDeliverSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={deliveryForm.control}
                  name="actualDeliveryDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Delivery Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={deliveryForm.control}
                  name="actualDeliveryTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={deliveryForm.control}
                name="deliveredQty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivered Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={deliveryForm.control}
                name="vehicleDetails"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle Number</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MH 12 AB 1234" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={deliveryForm.control}
                  name="driverName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={deliveryForm.control}
                  name="driverPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <Button variant="outline" type="button" className="flex-1" onClick={() => setDeliveryDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
                  Confirm Delivery
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
