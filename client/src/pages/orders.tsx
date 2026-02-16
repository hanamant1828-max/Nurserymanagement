import { useState, useEffect, useMemo } from "react";
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
import {
  Plus,
  ShoppingCart,
  CheckCircle,
  Layers,
  Check,
  ChevronsUpDown,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Edit2,
} from "lucide-react";
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
import { Calendar as CalendarIcon } from "lucide-react";
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
    categoryId: z.string().optional(),
    varietyId: z.string().optional(),
    lotId: z.string().min(1, "Please select a lot"),
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
    paymentMode: z.enum(["Cash", "PhonePe"]),
    deliveryDate: z.date(),
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
  {
    name: "Shivamogga",
    taluks: [
      "Shivamogga",
      "Bhadravathi",
      "Hosanagara",
      "Sagara",
      "Shikaripura",
      "Soraba",
      "Thirthahalli",
    ],
  },
  {
    name: "Tumakuru",
    taluks: [
      "Tumakuru",
      "Chikkanayakanahalli",
      "Gubbi",
      "Koratagere",
      "Kunigal",
      "Madhugiri",
      "Pavagada",
      "Sira",
      "Tiptur",
      "Turuvekere",
    ],
  },
  {
    name: "Udupi",
    taluks: [
      "Udupi",
      "Karkala",
      "Kundapura",
      "Byndoor",
      "Brahmavara",
      "Kapu",
      "Hebri",
    ],
  },
  {
    name: "Uttara Kannada",
    taluks: [
      "Karwar",
      "Ankola",
      "Kumta",
      "Honnavar",
      "Bhatkal",
      "Sirsi",
      "Siddapur",
      "Yellapur",
      "Mundgod",
      "Haliyal",
      "Joida",
      "Dandeli",
    ],
  },
  {
    name: "Vijayapura",
    taluks: [
      "Vijayapura",
      "Indi",
      "Muddebihal",
      "Sindgi",
      "Basavana Bagewadi",
      "Babaleshwar",
      "Chadchan",
      "Tikota",
      "Talikoti",
      "Devara Hippargi",
      "Almel",
      "Kolhar",
    ],
  },
  {
    name: "Yadgir",
    taluks: [
      "Yadgir",
      "Shahapur",
      "Shorapur",
      "Gurmitkal",
      "Hunasagi",
      "Wadgera",
    ],
  },
  {
    name: "Vijayanagara",
    taluks: [
      "Hosapete",
      "Kampli",
      "Hagaribommanahalli",
      "Kotturu",
      "Hadagali",
      "Harapanahalli",
    ],
  },
];

const DISTRICTS_DATA: Record<string, typeof MAHARASHTRA_DISTRICTS> = {
  Maharashtra: MAHARASHTRA_DISTRICTS,
  Karnataka: KARNATAKA_DISTRICTS,
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>("deliveryDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const limit = 50;
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
  const orders = ordersData?.orders || [];
  const totalOrders = ordersData?.total || 0;
  const totalPages = Math.ceil(totalOrders / limit);

  const { data: lots } = useLots();
  const { data: categories } = useCategories();
  const { data: varieties } = useVarieties();

  // Persistence key
  const PERSISTENCE_KEY = "orders_filters_state";

  // Initial state helper
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
  const [search, setSearch] = useState(initialState.search);
  const [currentPage, setCurrentPage] = useState(initialState.currentPage);
  const itemsPerPage = 10000;

  const [pageCategoryId, setPageCategoryId] = useState<string>(initialState.pageCategoryId);
  const [pageVarietyId, setPageVarietyId] = useState<string>(initialState.pageVarietyId);
  const [pageLotId, setPageLotId] = useState<string>(initialState.pageLotId);

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(initialState.dateRange);

  // Persist state changes
  useEffect(() => {
    const stateToSave = {
      search,
      pageCategoryId,
      pageVarietyId,
      pageLotId,
      dateRange,
      currentPage
    };
    localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(stateToSave));
  }, [search, pageCategoryId, pageVarietyId, pageLotId, dateRange, currentPage]);

  const handleClearFilters = () => {
    setSearch("");
    setPageCategoryId("all");
    setPageVarietyId("all");
    setPageLotId("all");
    const from = new Date();
    from.setDate(from.getDate() - 30);
    const to = new Date();
    to.setDate(to.getDate() + 30);
    setDateRange({ from, to });
    setCurrentPage(1);
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageCategoryId, pageVarietyId, pageLotId, dateRange]);

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  const filteredVarietiesPage = varieties?.filter(
    (v) =>
      pageCategoryId === "all" || v.categoryId.toString() === pageCategoryId,
  );

  const filteredLotsPage = lots?.filter(
    (l) =>
      (pageCategoryId === "all" ||
        l.categoryId.toString() === pageCategoryId) &&
      (pageVarietyId === "all" || l.varietyId.toString() === pageVarietyId),
  );

  // We'll use the server-side pagination for the main list,
  // but we still need some local filtering for the search query if it's used.
  // Ideally search would be server-side too, but for now we'll filter the current page.
  const filteredOrdersList = useMemo(() => {
    if (!orders) return [];

    return orders.filter((o: any) => {
      // Date filter (local for now)
      const deliveryDate = new Date(o.deliveryDate);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      
      const isWithinDateRange =
        deliveryDate >= fromDate && deliveryDate <= toDate;
      if (!isWithinDateRange) return false;

      const matchesSearch =
        !search ||
        o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        o.phone?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      if (pageCategoryId !== "all") {
        const lot = lots?.find((l) => l.id === o.lotId);
        if (lot?.categoryId.toString() !== pageCategoryId) return false;
      }

      if (pageVarietyId !== "all") {
        const lot = lots?.find((l) => l.id === o.lotId);
        if (lot?.varietyId.toString() !== pageVarietyId) return false;
      }

      if (pageLotId !== "all") {
        if (o.lotId.toString() !== pageLotId) return false;
      }

      return true;
    });
  }, [orders, search, lots, pageCategoryId, pageVarietyId, pageLotId, dateRange]);

  const paginatedOrders = filteredOrdersList;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bookedQty: 1,
      totalAmount: 0,
      advanceAmount: 0,
      paymentMode: "Cash",
      deliveryDate: new Date(),
    },
  });

  const { mutate: create, isPending: creating } = useCreateOrder();
  const { mutate: update } = useUpdateOrder();

  const selectedCategoryId = form.watch("categoryId");
  const selectedVarietyId = form.watch("varietyId");
  const selectedLotId = form.watch("lotId");
  const bookedQty = form.watch("bookedQty") || 0;
  const perUnitPrice = form.watch("perUnitPrice") || 0;
  const discount = form.watch("discount") || 0;
  const advanceAmount = form.watch("advanceAmount") || 0;

  // Auto-calculate total amount based on quantity, per unit price and discount
  useEffect(() => {
    const total = bookedQty * perUnitPrice - discount;
    form.setValue("totalAmount", Math.max(0, total));
  }, [bookedQty, perUnitPrice, discount, form]);

  const filteredVarieties = varieties?.filter(
    (v) =>
      !selectedCategoryId || v.categoryId.toString() === selectedCategoryId,
  );

  const availableLots = useMemo(() => {
    if (!lots || !orders) return [];
    return lots
      .filter(
        (l) =>
          (!selectedCategoryId ||
            l.categoryId.toString() === selectedCategoryId) &&
          (!selectedVarietyId ||
            l.varietyId.toString() === selectedVarietyId) &&
          l.available > 0,
      )
      .map((lot) => {
        // Get orders for this lot that are BOOKED or DELIVERED
        const lotOrders = orders.filter(
          (o: any) =>
            o.lotId === lot.id &&
            (o.status === "BOOKED" || o.status === "DELIVERED"),
        );
        return { ...lot, lotOrders };
      });
  }, [lots, orders, selectedCategoryId, selectedVarietyId]);

  const selectedLot = lots?.find((l) => l.id.toString() === selectedLotId);
  const selectedCategory = categories?.find(
    (c) => c.id === selectedLot?.categoryId,
  );
  const unitPrice = selectedCategory
    ? Number(selectedCategory.pricePerUnit)
    : 0;

  // Recalculate based on current form values to ensure sync
  const bookedQtyValue = form.watch("bookedQty") || 0;
  const advanceAmountValue = form.watch("advanceAmount") || 0;
  const totalAmountValue = form.watch("totalAmount") || 0;

  const remainingBalance = totalAmountValue - advanceAmountValue;
  const paymentStatus =
    advanceAmountValue === 0
      ? "Pending"
      : advanceAmountValue < totalAmountValue
        ? "Partially Paid"
        : "Paid";

  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  const checkPhone = async (phone: string) => {
    if (phone.length < 10) return;
    setIsSearchingPhone(true);
    try {
      const res = await fetch(`/api/customers/lookup?phone=${phone}`, {
        credentials: "include",
      });
      if (res.ok) {
        const customer = await res.json();
        if (customer) {
          form.setValue("customerName", customer.customerName);
          form.setValue("state", customer.state || "");
          form.setValue("district", customer.district || "");
          form.setValue("taluk", customer.taluk || "");
          form.setValue("village", customer.village || "");
          toast({
            title: "Customer Found",
            description: `Auto-filled details for ${customer.customerName}`,
          });
        } else {
          toast({
            title: "New Customer",
            description: "No record found. Please enter details manually.",
          });
        }
      }
    } catch (error) {
      console.error("Error looking up customer:", error);
    } finally {
      setIsSearchingPhone(false);
    }
  };

  // Auto-set delivery date from lot's expected ready date
  useEffect(() => {
    if (selectedLot?.expectedReadyDate && !editingOrder) {
      form.setValue("deliveryDate", new Date(selectedLot.expectedReadyDate));
    }
  }, [selectedLotId, selectedLot?.expectedReadyDate, form, editingOrder]);

  // Handle editing order
  useEffect(() => {
    if (editingOrder && lots) {
      const orderLot = lots.find((l) => l.id === editingOrder.lotId);
      form.reset({
        categoryId: orderLot?.categoryId?.toString() || "",
        varietyId: orderLot?.varietyId?.toString() || "",
        lotId: editingOrder.lotId.toString(),
        customerName: editingOrder.customerName || "",
        phone: editingOrder.phone || "",
        state: editingOrder.state || "",
        district: editingOrder.district || "",
        taluk: editingOrder.taluk || "",
        village: editingOrder.village || "",
        perUnitPrice: Number(editingOrder.perUnitPrice) || 0,
        bookedQty: editingOrder.bookedQty || 0,
        discount: Number(editingOrder.discount) || 0,
        totalAmount: Number(editingOrder.totalAmount) || 0,
        advanceAmount: Number(editingOrder.advanceAmount) || 0,
        paymentMode: (editingOrder.paymentMode as any) || "Cash",
        deliveryDate: editingOrder.deliveryDate
          ? new Date(editingOrder.deliveryDate)
          : new Date(),
        driverName: editingOrder.driverName || "",
        driverPhone: editingOrder.driverPhone || "",
      });
      setStep(4);
      setOpen(true);
    }
  }, [editingOrder, lots, form]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (selectedLot && data.bookedQty > selectedLot.available) {
      form.setError("bookedQty", {
        message: `Only ${selectedLot.available} available`,
      });
      return;
    }

    const payload = {
      lotId: parseInt(data.lotId),
      customerName: data.customerName,
      phone: data.phone,
      village: data.village || "",
      state: data.state,
      district: data.district,
      taluk: data.taluk,
      perUnitPrice: data.perUnitPrice.toString(),
      bookedQty: data.bookedQty,
      discount: (data.discount ?? 0).toString(),
      totalAmount: (data.totalAmount ?? 0).toString(),
      advanceAmount: (data.advanceAmount ?? 0).toString(),
      remainingBalance: remainingBalance.toString(),
      paymentStatus: paymentStatus,
      paymentMode: data.paymentMode,
      deliveryDate: format(data.deliveryDate, "yyyy-MM-dd"),
      driverName: data.driverName || "",
      driverPhone: data.driverPhone || "",
    };

    if (editingOrder) {
      update(
        { id: editingOrder.id, ...payload },
        {
          onSuccess: () => {
            setOpen(false);
            setEditingOrder(null);
            form.reset();
            setStep(1);
            toast({
              title: "Order Updated",
              description: "The order has been successfully updated.",
            });
          },
        },
      );
    } else {
      create(payload, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          setStep(1);
        },
      });
    }
  };

  const markDelivered = (id: number) => {
    // Trigger confetti immediately for better UX
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#10b981", "#3b82f6", "#f59e0b"],
    });

    const now = new Date();
    update(
      {
        id,
        status: "DELIVERED",
        deliveredQty: 0,
        actualDeliveryDate: format(now, "yyyy-MM-dd"),
        actualDeliveryTime: format(now, "HH:mm:ss"),
      },
      {
        onSuccess: () => {
          toast({
            title: "Order Delivered",
            description: "The order has been successfully delivered.",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Update Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  const undoDelivery = (id: number) => {
    update(
      { id, status: "BOOKED", deliveredQty: 0 },
      {
        onSuccess: () => {
          toast({
            title: "Undo Successful",
            description: "The order has been reverted to Booked status.",
          });
        },
        onError: (error: Error) => {
          toast({
            title: "Undo Failed",
            description: error.message,
            variant: "destructive",
          });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden border-2">
              <CardContent className="p-0">
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">
            Orders ({totalOrders})
          </h1>
          <p className="text-muted-foreground">
            Book new orders and manage deliveries (Page {page} of {totalPages}).
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search customer, phone, village, lot..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64"
          />
          <Select 
            value={`${sortField}-${sortOrder}`} 
            onValueChange={(val) => {
              const [field, order] = val.split("-");
              setSortField(field);
              setSortOrder(order as "asc" | "desc");
            }}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deliveryDate-desc">Ready Date (Newest)</SelectItem>
              <SelectItem value="deliveryDate-asc">Ready Date (Oldest)</SelectItem>
              <SelectItem value="customerName-asc">Name (A-Z)</SelectItem>
              <SelectItem value="customerName-desc">Name (Z-A)</SelectItem>
            </SelectContent>
          </Select>
          <Dialog
            open={open}
            onOpenChange={(v) => {
              setOpen(v);
              if (!v) {
                setEditingOrder(null);
                form.reset({
                  bookedQty: 1,
                  totalAmount: 0,
                  advanceAmount: 0,
                  paymentMode: "Cash",
                  deliveryDate: new Date(),
                });
                setStep(1);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" /> Book Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
              <DialogHeader className="pb-2">
                <DialogTitle>
                  {step === 1 && "Select Category"}
                  {step === 2 && "Select Variety"}
                  {step === 3 && "Select Stock Lot"}
                  {step === 4 && "Customer Details"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-3 mt-1"
                >
                  {step === 1 && (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {sortedCategories?.filter(c => c.active).map((category) => (
                          <Card 
                            key={category.id} 
                            className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                            onClick={() => {
                              form.setValue("categoryId", category.id.toString());
                              form.setValue("varietyId", "");
                              form.setValue("lotId", "");
                              setStep(2);
                            }}
                          >
                            <CardContent className="p-4 flex flex-col items-center gap-3">
                              {category.image ? (
                                <img src={category.image} className="w-20 h-20 object-cover rounded-lg shadow-sm" alt={category.name} />
                              ) : (
                                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border">
                                  <Layers className="w-10 h-10 text-muted-foreground/30" />
                                </div>
                              )}
                              <span className="font-bold text-center text-sm">{category.name}</span>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <Button variant="ghost" size="sm" onClick={() => setStep(1)}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Categories
                        </Button>
                        <h3 className="font-bold text-lg">Select Variety</h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredVarieties?.filter(v => v.active).map((variety) => (
                          <Card 
                            key={variety.id} 
                            className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                            onClick={() => {
                              form.setValue("varietyId", variety.id.toString());
                              form.setValue("lotId", "");
                              setStep(3);
                            }}
                          >
                            <CardContent className="p-4 flex flex-col items-center gap-2 text-center h-full justify-center">
                              <span className="font-bold text-base">{variety.name}</span>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex items-center gap-2 mb-4">
                        <Button variant="ghost" size="sm" onClick={() => setStep(2)}>
                          <ChevronLeft className="w-4 h-4 mr-1" /> Varieties
                        </Button>
                        <h3 className="font-bold text-lg">Select Lot</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {availableLots?.map((lot: any) => (
                          <Card 
                            key={lot.id} 
                            className="cursor-pointer hover:border-primary transition-colors hover:shadow-md"
                            onClick={() => {
                              form.setValue("lotId", lot.id.toString());
                              setStep(4);
                            }}
                          >
                            <CardContent className="p-4 flex items-center justify-between">
                              <div className="space-y-1">
                                <p className="font-black text-lg leading-tight">Lot #{lot.lotNumber}</p>
                                <div className="flex items-center gap-2 text-xs text-primary font-bold">
                                  <CalendarIcon className="w-3 h-3" />
                                  <span>Ready: {lot.expectedReadyDate || "N/A"}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Available</p>
                                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-sm">
                                  {lot.available}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {step === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      {selectedLot && (
                        <div className="bg-primary/5 border border-primary/10 p-3 rounded-lg flex justify-between items-center shadow-sm mb-6">
                          <div className="flex items-center gap-4">
                            {selectedLot.category?.image && (
                              <img
                                src={selectedLot.category.image}
                                className="w-14 h-14 rounded-md object-cover border border-primary/20 shadow-sm"
                                alt=""
                              />
                            )}
                            <div className="space-y-0.5">
                              <p className="font-bold text-lg leading-tight text-foreground">
                                {selectedLot.variety?.name}
                              </p>
                              <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
                                {selectedLot.lotNumber}
                              </p>
                              <div className="flex gap-3 mt-1 text-[11px] font-medium">
                                <span className="text-muted-foreground">
                                  Sowing: {selectedLot.sowingDate}
                                </span>
                                <span className="text-primary">
                                  Expected Ready:{" "}
                                  {selectedLot.expectedReadyDate}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider mb-1">
                                Stock
                              </p>
                              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white font-black text-sm px-3 py-1 rounded-md shadow-sm border-none">
                                {selectedLot.available}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setStep(1)}
                              className="h-10 font-bold px-4 rounded-md border-primary/20 hover:bg-primary/5 shadow-sm"
                            >
                              Change
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Customer Name <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Name"
                                  className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Mobile Number <span className="text-destructive">*</span>
                              </FormLabel>
                              <div className="flex gap-2">
                                <FormControl>
                                  <Input
                                    placeholder="Phone"
                                    className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20 flex-1"
                                    {...field}
                                    onChange={(e) => {
                                      const val = e.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 10);
                                      field.onChange(val);
                                      if (val.length === 10) {
                                        checkPhone(val);
                                      }
                                    }}
                                  />
                                </FormControl>
                                {isSearchingPhone && (
                                  <div className="flex items-center">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                  </div>
                                )}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                State <span className="text-destructive">*</span>
                              </FormLabel>
                              <Select
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  form.setValue("district", "");
                                  form.setValue("taluk", "");
                                }}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger className="h-12 text-lg bg-muted/30 border-muted focus:ring-primary/20">
                                    <SelectValue placeholder="Select State" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="Karnataka">
                                    Karnataka
                                  </SelectItem>
                                  <SelectItem value="Maharashtra">
                                    Maharashtra
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="district"
                          render={({ field }) => {
                            const selectedState = form.watch("state");
                            const districts = selectedState
                              ? DISTRICTS_DATA[selectedState]
                              : [];

                            return (
                              <FormItem>
                                <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  District <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={(val) => {
                                    field.onChange(val);
                                    form.setValue("taluk", "");
                                  }}
                                  value={field.value}
                                  disabled={!selectedState}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-lg bg-muted/30 border-muted focus:ring-primary/20">
                                      <SelectValue placeholder="Select District" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    {districts.map((d) => (
                                      <SelectItem key={d.name} value={d.name}>
                                        {d.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="taluk"
                          render={({ field }) => {
                            const selectedState = form.watch("state");
                            const selectedDistrictName = form.watch("district");
                            const districts = selectedState
                              ? DISTRICTS_DATA[selectedState]
                              : [];
                            const selectedDistrict = districts.find(
                              (d) => d.name === selectedDistrictName,
                            );
                            const taluks = selectedDistrict?.taluks || [];

                            return (
                              <FormItem>
                                <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                  Taluk <span className="text-destructive">*</span>
                                </FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  value={field.value}
                                  disabled={!selectedDistrictName}
                                >
                                  <FormControl>
                                    <SelectTrigger className="h-12 text-lg bg-muted/30 border-muted focus:ring-primary/20">
                                      <SelectValue placeholder="Select Taluk" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="max-h-60 overflow-y-auto">
                                    {taluks.map((t) => (
                                      <SelectItem key={t} value={t}>
                                        {t}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                        <div className="flex flex-col gap-2">
                          <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Village / Area
                          </label>
                          <FormField
                            control={form.control}
                            name="village"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="Address"
                                    className="h-12 text-xl font-black bg-muted/30 border-muted focus-visible:ring-primary/20"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="bookedQty"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Quantity <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20"
                                  {...field}
                                  max={selectedLot?.available}
                                  onChange={(e) =>
                                    field.onChange(
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </FormControl>
                              {selectedLot &&
                                field.value > selectedLot.available && (
                                  <p className="text-[10px] font-bold text-destructive uppercase tracking-tight mt-1 animate-pulse">
                                    Quantity exceeds stock (
                                    {selectedLot.available} available)
                                  </p>
                                )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="perUnitPrice"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Price per Unit (₹) <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20"
                                  {...field}
                                  data-testid="input-per-unit-price"
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
                          name="discount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Discount (₹)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="h-12 text-lg bg-muted/30 border-muted focus-visible:ring-primary/20 text-orange-600 font-bold"
                                  {...field}
                                  data-testid="input-discount"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="deliveryDate"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Expected Delivery Date (From Lot)
                              </FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Button
                                    variant="outline"
                                    disabled
                                    className="h-12 w-full pl-10 text-left text-lg font-bold bg-muted/50 border-muted cursor-not-allowed"
                                  >
                                    {field.value ? (
                                      format(field.value, "dd MMM yyyy")
                                    ) : (
                                      <span>No date set</span>
                                    )}
                                  </Button>
                                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-70" />
                                </div>
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
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Total Amount (₹) <span className="text-destructive">*</span>
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  readOnly
                                  className="h-12 text-lg bg-emerald-50 border-emerald-200 text-emerald-700 font-bold"
                                  {...field}
                                  data-testid="input-total-amount"
                                />
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
                              <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                Advance (₹)
                              </FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  className="h-12 text-lg bg-muted/30 border-primary focus-visible:ring-primary/20 border-2 font-bold"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Remaining Balance
                          </FormLabel>
                          <div
                            className={cn(
                              "h-12 px-3 py-2 rounded-md border font-bold flex items-center text-lg",
                              remainingBalance < 0
                                ? "text-destructive bg-destructive/5 border-destructive/20"
                                : remainingBalance === 0
                                  ? "text-emerald-600 bg-emerald-50 border-emerald-200"
                                  : "text-amber-600 bg-amber-50 border-amber-200",
                            )}
                          >
                            ₹{remainingBalance.toLocaleString()}
                          </div>
                        </FormItem>
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            Payment Status
                          </FormLabel>
                          <div className="flex items-center h-12">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-base px-4 py-1.5 font-bold",
                                paymentStatus === "Paid"
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                                  : paymentStatus === "Partially Paid"
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-slate-100 text-slate-700 border-slate-200",
                              )}
                            >
                              {paymentStatus}
                            </Badge>
                          </div>
                        </FormItem>
                      </div>

                      <FormField
                        control={form.control}
                        name="paymentMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                              Payment Mode <span className="text-destructive">*</span>
                            </FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || "Cash"}
                            >
                              <FormControl>
                                <SelectTrigger className="h-12 text-lg bg-muted/30 border-muted focus:ring-primary/20">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Cash">Cash</SelectItem>
                                <SelectItem value="PhonePe">
                                  PhonePe / UPI
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                              <div className="bg-muted/30 p-4 rounded-lg border-2 border-dashed space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="driverName"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                          Driver Name
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Driver Name"
                                            className="h-10 text-base bg-background border-muted focus-visible:ring-primary/20"
                                            {...field}
                                          />
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
                                        <FormLabel className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                                          Driver Phone
                                        </FormLabel>
                                        <FormControl>
                                          <Input
                                            placeholder="Driver Phone"
                                            className="h-10 text-base bg-background border-muted focus-visible:ring-primary/20"
                                            {...field}
                                            onChange={(e) =>
                                              field.onChange(
                                                e.target.value
                                                  .replace(/\D/g, "")
                                                  .slice(0, 10),
                                              )
                                            }
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground font-medium">
                                      Total Amount
                                    </span>
                          <span className="text-lg font-black text-foreground">
                            ₹{(totalAmountValue || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-medium">
                            Advance Paid
                          </span>
                          <span className="text-lg font-black text-emerald-600">
                            - ₹{(advanceAmountValue || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="border-t pt-2 mt-2 flex justify-between items-center">
                          <span className="text-base font-bold text-foreground">
                            Remaining Balance
                          </span>
                          <span
                            className={cn(
                              "text-xl font-black",
                              remainingBalance < 0
                                ? "text-destructive"
                                : remainingBalance === 0
                                  ? "text-emerald-600"
                                  : "text-amber-600",
                            )}
                          >
                            ₹{remainingBalance.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          onClick={() => setStep(3)}
                          className="flex-1 h-14 text-lg font-bold rounded-xl border-primary/20 hover:bg-primary/5"
                        >
                          Back
                        </Button>
                        <Button
                          type="submit"
                          size="lg"
                          className="flex-[2] h-14 text-xl font-black rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                          disabled={
                            creating ||
                            (selectedLot
                              ? bookedQty > selectedLot.available
                              : false)
                          }
                        >
                          Confirm Order
                        </Button>
                      </div>
                    </div>
                  )}
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-muted/30 p-4 rounded-xl mb-8">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            From Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-11 bg-background border-muted-foreground/20"
              >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                {dateRange.from ? (
                  format(dateRange.from, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) =>
                  date && setDateRange((prev) => ({ ...prev, from: date }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            To Date
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start text-left font-normal h-11 bg-background border-muted-foreground/20"
              >
                <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                {dateRange.to ? (
                  format(dateRange.to, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) =>
                  date && setDateRange((prev) => ({ ...prev, to: date }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Category Filter
          </label>
          <SearchableSelect
            options={[
              { id: "all", name: "All Categories" },
              ...(categories || []),
            ]}
            value={pageCategoryId}
            onValueChange={(val) => {
              setPageCategoryId(val);
              setPageVarietyId("all");
              setPageLotId("all");
            }}
            placeholder="All Categories"
            searchFields={["name"]}
            renderItem={(c) => (
              <div className="flex items-center gap-3 py-1">
                {c.id === "all" ? (
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                ) : c.image ? (
                  <img
                    src={c.image}
                    className="w-8 h-8 rounded-md object-cover border"
                    alt=""
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                    <Layers className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <span
                  className={cn(
                    "text-sm",
                    c.id === "all" ? "font-bold text-primary" : "font-semibold",
                  )}
                >
                  {c.name}
                </span>
              </div>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Variety Filter
          </label>
          <SearchableSelect
            options={[
              { id: "all", name: "All Varieties" },
              ...(filteredVarietiesPage || []),
            ]}
            value={pageVarietyId}
            onValueChange={(val) => {
              setPageVarietyId(val);
              setPageLotId("all");
            }}
            placeholder="All Varieties"
            disabled={pageCategoryId === "all"}
            searchFields={["name"]}
            renderItem={(v) => (
              <div className="flex items-center gap-3 py-1">
                {v.id === "all" ? (
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                    <Layers className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <span
                  className={cn(
                    "text-sm",
                    v.id === "all" ? "font-bold text-primary" : "font-semibold",
                  )}
                >
                  {v.name}
                </span>
              </div>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Lot Filter
          </label>
          <SearchableSelect
            options={[
              { id: "all", name: "All Lots", lotNumber: "All Lots" },
              ...(filteredLotsPage || []),
            ]}
            value={pageLotId}
            onValueChange={(val) => setPageLotId(val)}
            placeholder="All Lots"
            disabled={pageVarietyId === "all"}
            searchFields={["lotNumber"]}
            renderItem={(l) => (
              <div className="flex items-center gap-3 py-1">
                {l.id === "all" ? (
                  <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center border">
                    <Layers className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                )}
                <div className="flex flex-col">
                  <span
                    className={cn(
                      "text-sm leading-tight",
                      l.id === "all"
                        ? "font-bold text-primary"
                        : "font-semibold",
                    )}
                  >
                    {l.id === "all" ? l.name : l.lotNumber}
                  </span>
                  {l.id !== "all" && (
                    <span className="text-[10px] text-muted-foreground">
                      Stock: {l.available}
                    </span>
                  )}
                </div>
              </div>
            )}
          />
        </div>

        {(pageCategoryId !== "all" ||
          pageVarietyId !== "all" ||
          pageLotId !== "all") && (
          <Button
            variant="ghost"
            onClick={() => {
              setPageCategoryId("all");
              setPageVarietyId("all");
              setPageLotId("all");
            }}
            className="h-11 px-4 text-muted-foreground hover:text-foreground col-span-full lg:col-auto"
          >
            Clear Filters
          </Button>
        )}
      </div>

      <div className="hidden md:block w-full rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-b">
              <TableHead className="w-[80px] font-bold text-muted-foreground uppercase tracking-wider h-12">
                ID
              </TableHead>
              <TableHead 
                className="font-bold text-muted-foreground uppercase tracking-wider h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => toggleSort("customerName")}
              >
                <div className="flex items-center">
                  Customer
                  <SortIcon field="customerName" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider h-12">
                Plant Details
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider h-12 text-center">
                Taken By
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-center h-12">
                Qty
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-center h-12">
                Rate
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-center h-12">
                Total
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-center h-12">
                Adv/Bal
              </TableHead>
              <TableHead 
                className="font-bold text-muted-foreground uppercase tracking-wider h-12 cursor-pointer hover:bg-muted/50 transition-colors select-none"
                onClick={() => toggleSort("deliveryDate")}
              >
                <div className="flex items-center">
                  Ready Date
                  <SortIcon field="deliveryDate" />
                </div>
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-center h-12">
                Status
              </TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-right h-12 pr-6">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={12} className="h-24 text-center">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : filteredOrdersList.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart className="w-8 h-8 opacity-20" />
                    No orders found.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map((order) => {
                const lot = lots?.find((l) => l.id === order.lotId);
                const variety = varieties?.find((v) => v.id === lot?.varietyId);
                const category = categories?.find(
                  (c) => c.id === lot?.categoryId,
                );

                return (
                  <TableRow
                    key={order.id}
                    className="group hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="font-mono text-muted-foreground text-xs">
                      #{order.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground text-base leading-tight">
                          {order.customerName}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">
                          {order.phone}
                        </span>
                        {order.village && (
                          <span className="text-sm font-black text-foreground tracking-wider flex items-center gap-1 mt-0.5">
                            <Layers className="w-2.5 h-2.5" />
                            {order.village}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {category?.image ? (
                          <img
                            src={category.image}
                            className="w-12 h-12 rounded-lg object-cover border-2 border-background shadow-sm ring-1 ring-muted"
                            alt=""
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center border-2 border-background shadow-sm ring-1 ring-muted">
                            <Layers className="w-6 h-6 text-muted-foreground/30" />
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <span className="font-black text-foreground text-sm leading-tight">
                            {category?.name}
                          </span>
                          <span className="font-bold text-muted-foreground text-xs">
                            {variety?.name}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tighter">
                            {lot?.lotNumber}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {(() => {
                        const orderWithCreator = order as any;
                        return orderWithCreator.creator ? (
                          <div className="flex flex-col items-center justify-center gap-1">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary">
                              {orderWithCreator.creator.username
                                .charAt(0)
                                .toUpperCase()}
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {orderWithCreator.creator.username}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">
                            System
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center font-black text-emerald-600 text-lg">
                      {order.bookedQty}
                    </TableCell>
                    <TableCell className="text-center font-bold text-muted-foreground text-base">
                      ₹{Number(order.perUnitPrice || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center font-black text-foreground text-lg">
                      ₹{Number(order.totalAmount || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-sm font-black text-blue-600">
                          ₹{Number(order.advanceAmount || 0).toLocaleString()}
                        </span>
                        <span className="text-[11px] font-bold text-orange-600">
                          ₹
                          {Number(order.remainingBalance || 0).toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-muted-foreground text-sm whitespace-nowrap">
                      {format(new Date(order.deliveryDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2 py-0.5",
                          order.status === "DELIVERED"
                            ? "bg-emerald-500 text-white border-transparent"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200",
                        )}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {order.status === "BOOKED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all font-bold text-xs"
                            onClick={() => markDelivered(order.id)}
                          >
                            Mark Delivered
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all"
                          onClick={() => setEditingOrder(order)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4 border-t bg-card rounded-b-xl border-x border-b">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, filteredOrdersList.length)}
            </span>{" "}
            of <span className="font-medium">{filteredOrdersList.length}</span>{" "}
            results
          </p>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev: number) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              </PaginationItem>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show current page, first, last, and neighbors
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  );
                })
                .map((page, index, array) => {
                  const items = [];
                  if (index > 0 && page - array[index - 1] > 1) {
                    items.push(
                      <PaginationItem key={`ellipsis-${page}`}>
                        <span className="px-2 text-muted-foreground">...</span>
                      </PaginationItem>,
                    );
                  }
                  items.push(
                    <PaginationItem key={page}>
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        className="w-9"
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    </PaginationItem>,
                  );
                  return items;
                })}

              <PaginationItem>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev: number) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      <div className="md:hidden space-y-4 pb-12">
        {isLoading ? (
          <div className="h-24 flex items-center justify-center">
            Loading orders...
          </div>
        ) : filteredOrdersList.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground italic bg-muted/20 rounded-lg border-2 border-dashed">
            No orders found.
          </div>
        ) : (
          paginatedOrders.map((order) => {
            const lot = lots?.find((l) => l.id === order.lotId);
            const variety = varieties?.find((v) => v.id === lot?.varietyId);
            const category = categories?.find((c) => c.id === lot?.categoryId);
            return (
              <Card
                key={order.id}
                className="overflow-hidden border-2 hover:border-primary/20 transition-all shadow-sm active:scale-[0.98]"
              >
                <CardContent className="p-0">
                  <div
                    className={`p-3 flex justify-between items-center ${order.status === "BOOKED" ? "bg-amber-500/10" : "bg-emerald-500/10"}`}
                  >
                      <div
                        className="flex flex-col flex-1 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                        onClick={() => toggleSort("customerName")}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-black text-lg leading-tight">
                            {order.customerName}
                          </p>
                          <SortIcon field="customerName" />
                        </div>
                        <p className="text-sm font-mono text-muted-foreground">
                          {order.phone}
                        </p>
                      </div>
                    <Badge
                      className={`font-black text-xs px-2 py-1 rounded-md shadow-sm border-none ${
                        order.status === "BOOKED"
                          ? "bg-amber-500 text-white"
                          : order.status === "DELIVERED"
                            ? "bg-emerald-500 text-white"
                            : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {order.status}
                    </Badge>
                  </div>

                  <div className="p-4 space-y-4">
                    <div 
                      className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-lg transition-colors"
                      onClick={() => toggleSort("deliveryDate")}
                    >
                      {category?.image ? (
                        <img
                          src={category.image}
                          className="w-12 h-12 rounded-md object-cover border"
                          alt=""
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border">
                          <Layers className="w-6 h-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                            Ready Date & Variety
                          </p>
                          <SortIcon field="deliveryDate" />
                        </div>
                        <p className="font-bold text-sm leading-tight text-primary uppercase">
                          {category?.name}
                        </p>
                        <p className="font-bold text-sm leading-tight">
                          {variety?.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-1 rounded">
                            Lot: {lot?.lotNumber}
                          </span>
                          <span className="text-xs font-bold text-primary">
                            ₹{Number(order.perUnitPrice).toLocaleString()}/unit
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Qty
                        </p>
                        <p className="font-black text-2xl text-primary">
                          {order.bookedQty}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Ready Date
                        </p>
                        <p className="text-sm font-bold">
                          {format(new Date(order.deliveryDate), "dd MMM yyyy")}
                        </p>
                        {order.village && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <MapPin className="w-3 h-3 text-muted-foreground/60" />
                            <span className="text-sm font-black text-foreground">
                              {order.village}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1 text-right">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          Payment Details
                        </p>
                        <p className="text-base font-black text-emerald-600 leading-none">
                          Total: ₹{Number(order.totalAmount).toLocaleString()}
                        </p>
                        <div className="flex flex-col text-[9px] font-bold mt-1">
                          <span className="text-blue-600 leading-tight">
                            Adv: ₹{Number(order.advanceAmount).toLocaleString()}
                          </span>
                          <span className="text-amber-600 leading-tight">
                            Bal: ₹
                            {Number(order.remainingBalance).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {order.status === "BOOKED" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex-1 font-bold h-12 rounded-xl"
                          onClick={() => setEditingOrder(order)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="lg"
                          onClick={() => markDelivered(order.id)}
                          className="flex-[2] font-black text-base h-12 rounded-xl shadow-md shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 active-elevate-2"
                        >
                          <CheckCircle className="w-5 h-5 mr-2" /> Mark
                          Delivered
                        </Button>
                      </div>
                    ) : (
                      order.status === "DELIVERED" && (
                        <div className="flex gap-2">
                          <Button
                            disabled
                            size="lg"
                            className="flex-[3] font-black text-base h-12 rounded-xl bg-muted text-muted-foreground border-none"
                          >
                            <CheckCircle className="w-5 h-5 mr-2" /> Delivered
                          </Button>
                          <Button
                            size="lg"
                            variant="outline"
                            className="flex-1 font-bold h-12 rounded-xl border-destructive/20 text-destructive hover:bg-destructive/5"
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to undo this delivery?",
                                )
                              ) {
                                undoDelivery(order.id);
                              }
                            }}
                          >
                            Undo
                          </Button>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      <div className="flex items-center justify-center space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <div className="text-sm font-medium">
          Page {page} of {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
