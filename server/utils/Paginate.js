
function paginate(array,page_Size,page_number){
      return array.slice((page_number - 1) * page_size, page_number * page_size);
}

export {paginate}